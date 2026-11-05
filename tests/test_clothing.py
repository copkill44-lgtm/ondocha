from pathlib import Path
import json
import unittest
import quickjs

BOOT = r"""
const localStorage={getItem(){return null;},setItem(){}};
class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.style={};this.className='';this.value='';this.checked=false;this.classList={add(){},remove(){},toggle(){}};}
 append(...items){this.children.push(...items);}
 appendChild(item){this.append(item);}
 replaceChildren(...items){this.children=items;}
 addEventListener(){}
 setAttribute(){}
 querySelectorAll(selector){return this.children.flatMap(x=>[...(selector==='.category-item' && x.className==='category-item'?[x]:[]),...x.querySelectorAll(selector)]);}
}
const nodes={};
function $(id){return nodes[id]||(nodes[id]=new Node());}
function allInputs(node){return node.children.flatMap(x=>[...(x.tag==='input'?[x]:[]),...allInputs(x)]);}
const document={
 getElementById:$,createElement:tag=>new Node(tag),
 querySelectorAll(selector){
  const match=selector.match(/name=["\']?([A-Za-z]+)/);
  return Object.values(nodes).flatMap(allInputs).filter(x=>(!match || x.name===match[1])&&(!selector.includes(':checked')||x.checked));
 },
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
};
function choose(group,value){
 const input=document.querySelectorAll('input[name="'+group+'"]').find(x=>x.value===value);
 if(input.type==='radio') document.querySelectorAll('input[name="'+group+'"]').forEach(x=>x.checked=false);
 input.checked=!input.checked;
 if(group==='accessoryCategory') normalizeAccessorySelection(input);
}
let looks=[],selected=0,characterConfig={},weatherTemp=20,city='서울';
function renderOutfitAvatar(){return '';}
function escapeCalendarText(x){return x;}
function mountOutfitImageControls(){}
function resetOutfitCards(){}
function toast(){}
"""
class ClothingTests(unittest.TestCase):
 def setUp(self):
  self.ctx=quickjs.Context()
  self.ctx.eval(BOOT)
  for name in ['clothing.js','recommendations.js']:
   self.ctx.eval(Path('scripts',name).read_text(encoding='utf-8'))
  self.ctx.eval("renderCategoryChoices();")
 def result(self,code):
  return json.loads(self.ctx.eval('JSON.stringify('+code+')'))
 def test_top_and_outerwear_are_independent(self):
  for top in ['반팔','긴팔']:
   self.ctx.eval("choose('topCategory',"+json.dumps(top)+");choose('outerCategory','가디건');")
   self.assertEqual(self.result("[selectedClothingValues('topCategory')[0],outerwearSelection()]"),[top,'가디건'])
 def test_multiple_accessories_survive_rerender(self):
  self.ctx.eval("choose('accessoryCategory','가방');choose('accessoryCategory','시계');renderCategoryChoices();")
  self.assertEqual(self.result("selectedClothingValues('accessoryCategory')"),['가방','시계'])
 def test_none_and_recommendation_are_exclusive(self):
  self.ctx.eval("choose('accessoryCategory','가방');choose('accessoryCategory','시계');choose('accessoryCategory','없음');")
  self.assertEqual(self.result("selectedClothingValues('accessoryCategory')"),['없음'])
  self.ctx.eval("choose('accessoryCategory','액세서리 추천받기');choose('accessoryCategory','모자');")
  self.assertEqual(self.result("selectedClothingValues('accessoryCategory')"),['모자'])
 def test_unchecking_last_accessory_defaults_to_none(self):
  self.ctx.eval("choose('accessoryCategory','가방');choose('accessoryCategory','가방');")
  self.assertEqual(self.result("selectedClothingValues('accessoryCategory')"),['없음'])
 def test_recommendations_include_outerwear_and_all_accessories(self):
  self.ctx.eval("""choose('topCategory','긴팔');choose('outerCategory','가디건');
choose('accessoryCategory','가방');choose('accessoryCategory','시계');
const feel=new Node('input');feel.name='feel';feel.value='괜찮아요';feel.checked=true;$('feel').append(feel);
generateRecommendations();""")
  self.assertTrue(all(x['outerwear']=='가디건' and '가방' in x['accessory'] and '시계' in x['accessory'] for x in self.result('looks')))
  self.assertIn('겉옷',self.ctx.eval("$('outfits').innerHTML"))
if __name__=='__main__':unittest.main()
