(function(root){'use strict';
const catalog=[
 {name:'Диван',re:/диван[а-я]*/,kg:[50,120],m3:[1.3,2.6]},
 {name:'Холодильник',re:/холодильник[а-я]*/,kg:[45,100],m3:[.5,1]},
 {name:'Стиральная машина',re:/стиральн[а-я]*\s+машин[а-я]*|стиралк[а-я]*/,kg:[50,85],m3:[.35,.55]},
 {name:'Посудомоечная машина',re:/посудомо[а-я]*(?:\s+машин[а-я]*)?/,kg:[30,60],m3:[.25,.5]},
 {name:'Коробка с вещами',re:/короб[а-я]*|коробк[а-я]*/,kg:[5,25],m3:[.04,.12]},
 {name:'Шкаф',re:/шкаф[а-я]*/,kg:[50,150],m3:[1,3]},
 {name:'Кровать',re:/кроват[а-я]*/,kg:[35,110],m3:[1,2.5]},
 {name:'Матрас',re:/матрас[а-я]*/,kg:[15,45],m3:[.3,.9]},
 {name:'Стол',re:/стол(?:а|ов|ы|ик[а-я]*)?(?![а-я])/,kg:[15,55],m3:[.3,1]},
 {name:'Стул',re:/стул[а-я]*|стуль[а-я]*/,kg:[3,12],m3:[.08,.25]},
 {name:'Кресло',re:/крес[а-я]*/,kg:[15,45],m3:[.4,1]},
 {name:'Комод',re:/комод[а-я]*/,kg:[25,70],m3:[.4,1]},
 {name:'Телевизор',re:/телевизор[а-я]*/,kg:[5,30],m3:[.05,.25]},
 {name:'Велосипед',re:/велосипед[а-я]*/,kg:[10,25],m3:[.25,.6]},
 {name:'Мешок цемента (50 кг)',re:/цемент[а-я]*/,kg:[50,50],m3:[.025,.04]},
 {name:'Кирпич',re:/кирпич[а-я]*/,kg:[2.5,4.5],m3:[.002,.003]},
 {name:'Мешок картофеля',re:/картофел[а-я]*|картошк[а-я]*/,kg:[20,40],m3:[.03,.07]},
 {name:'Палета с товаром',re:/пал[её]т[а-я]*|поддон[а-я]*/,kg:[0,0],m3:[.8,2],requiresMass:true}
];
const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
function mass(n,u){return Number(String(n).replace(',','.'))*(/^т|тон/.test(u)?1000:1);}
function estimateCargo(text){
 const clean=String(text||'').toLowerCase().replace(/ё/g,'е').replace(/[ \t]+/g,' ').trim();if(!clean)return {complete:false,items:[],unknown:[],minKg:0,maxKg:0,minM3:0,maxM3:0};
 const total=clean.match(/(?:общий\s+вес|всего|вес)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(кг|килограмм[а-я]*|т(?:онн[а-я]*)?)(?![а-я])/);
 if(total){const kg=mass(total[1],total[2]);if(kg>0&&kg<=1000000)return {complete:true,provided:true,items:[],unknown:[],minKg:kg,maxKg:kg,minM3:0,maxM3:0};}
 const parts=clean.split(/(?<!\d),(?!\d)|;|\n|\s+и\s+|\s*\+\s*/).map(s=>s.trim()).filter(Boolean);
 const items=[],unknown=[];let minKg=0,maxKg=0,minM3=0,maxM3=0;
 for(const part of parts){
  const entry=catalog.find(e=>e.re.test(part));
  if(!entry){const direct=part.match(/^(?:товар\s+|груз\s+)?(\d+(?:[.,]\d+)?)\s*(кг|килограмм[а-я]*|т(?:онн[а-я]*)?)(?![а-я])/);if(direct){const kg=mass(direct[1],direct[2]);if(kg>0&&kg<=1000000){minKg+=kg;maxKg+=kg;items.push({name:'Груз с указанной массой',count:1,minKg:kg,maxKg:kg,provided:true});continue;}}unknown.push(part);continue;}
  if(catalog.some(e=>e!==entry&&e.re.test(part))){unknown.push(part+' — разделите предметы запятыми');continue;}
  const match=part.match(entry.re),before=part.slice(0,match.index),after=part.slice(match.index+match[0].length);
  if(/\d+[.,]\d+\s*$/.test(before)||/^\s*[:x×]?\s*\d+[.,]\d+/.test(after)||/-\s*\d+\s*$/.test(before)||/^\s*-\s*\d+/.test(after)){unknown.push(part+' — укажите целое положительное количество');continue;}
  const pre=before.match(/(\d+)\s*(?:шт\.?|штук[а-я]*|мешк[а-я]*|x|×)?\s*$/),post=after.match(/^\s*[:x×\-]?\s*(\d+)\s*(?:шт\.?|штук[а-я]*|мешк[а-я]*)?/);
  const count=Number((pre||post||[])[1]||1);
  const per=part.match(/по\s+(\d+(?:[.,]\d+)?)\s*(кг|килограмм[а-я]*|т(?:онн[а-я]*)?)(?![а-я])/);
  if(!Number.isInteger(count)||count<1||count>100000||(entry.requiresMass&&!per)){unknown.push(part);continue;}
  if(!per&&/\d\s*(?:кг|килограмм|тонн)/.test(part)){unknown.push(part+' — укажите массу через «по … кг» или общий вес');continue;}
  const weight=per?mass(per[1],per[2]):null;
  if(per&&(!Number.isFinite(weight)||weight<=0||weight>1000000)){unknown.push(part);continue;}
  const lo=(weight??entry.kg[0])*count,hi=(weight??entry.kg[1])*count;
  minKg+=lo;maxKg+=hi;minM3+=entry.m3[0]*count;maxM3+=entry.m3[1]*count;
  items.push({name:entry.name,count,minKg:lo,maxKg:hi,provided:Boolean(per)});
 }
 return {complete:items.length>0&&unknown.length===0,items,unknown,minKg:Math.round(minKg*10)/10,maxKg:Math.round(maxKg*10)/10,minM3,maxM3};
}
function chooseVehicle(cargo,vehicles){if(!cargo?.complete||!(cargo.maxKg>0))return 'unknown';for(const key of ['small','medium','large']){const v=vehicles[key];if(cargo.maxKg<=v.capacityKg&&cargo.maxM3<=v.capacityM3)return key;}return 'unknown';}
root.OTONCargo={catalog,estimateCargo,chooseVehicle};if(typeof module==='object'&&module.exports)module.exports=root.OTONCargo;
})(typeof globalThis!=='undefined'?globalThis:this);
