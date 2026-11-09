import re,json,sys,html,urllib.request
UA={'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537.36'}
def get(u): return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read().decode('utf8','ignore')
h=get('https://www.classaction.org/settlements')
out={}
for m in re.finditer(r'<div id="([^"]+)"[^>]*class="[^"]*settlement-card(.*?)Share</button>',h,re.S):
    slug,b=m.group(1),m.group(2)
    t=lambda r:(lambda x:html.unescape(re.sub('<[^>]+>','',x.group(1))).strip() if x else '')(re.search(r,b,re.S))
    url=re.search(r'href="([^"]+)" class="js-settlement-link',b)
    out[slug]=dict(slug=slug,name=t(r'data-name="([^"]+)"'),url=url.group(1) if url else '',
      payout=t(r'Payout</span>\s*<span[^>]*>(.*?)</span>'),deadline=t(r'Deadline</span>\s*<span[^>]*>(.*?)</span>'),
      proof=t(r'Required\?</span>\s*<span[^>]*>(.*?)</span>'),summary=t(r'<p class="f6[^"]*"[^>]*>(.*?)</p>'),source='https://www.classaction.org/settlements#'+slug)
json.dump(list(out.values()),open(sys.argv[1] if len(sys.argv)>1 else 'data/raw_classaction_org.json','w'),indent=1)
print(len(out))
