'use strict';
const $=s=>document.querySelector(s);
const menuButton=$('.menu-button'),mobileNav=$('#mobile-nav');
function closeMenu(){menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Открыть меню');mobileNav.hidden=true;}
menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');mobileNav.hidden=!open;});
mobileNav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.querySelectorAll('.header-cta,.brand').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
window.addEventListener('resize',()=>{if(window.innerWidth>820)closeMenu();});
const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n)+' ₽';
const vehicles={small:{tag:'Небольшие грузы и переезды',title:'Малый грузовик',description:'Мебель, бытовая техника, коробки и небольшие партии товаров. Удобный вариант для города и небольшого переезда.',weight:'до 1,5 т',scale:'scale(.93)'},medium:{tag:'Переезды и партии товара',title:'Средний грузовик',description:'Офисный переезд, строительные материалы или партия товара. Больше места для задач, которым тесно в малой машине.',weight:'до 5 т',scale:'scale(1)'},large:{tag:'Крупные грузы и поставки',title:'Большегрузный транспорт',description:'Крупные партии товаров, оборудование и объёмные поставки. Формат для больших задач и междугородних маршрутов.',weight:'до 20 т',scale:'scale(1.06)'}};
let chosenVehicle='small';const tabs=[...document.querySelectorAll('[role=tab]')];
function selectVehicle(key){if(!vehicles[key])return;chosenVehicle=key;const v=vehicles[key];tabs.forEach(t=>{const active=t.dataset.vehicle===key;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;const label=t.querySelector('.fleet-select-label');if(label)label.textContent=active?'Выбрано':'Подробнее';});$('#vehicle-panel').setAttribute('aria-labelledby','tab-'+key);$('#vehicle-tag').textContent=v.tag;$('#vehicle-title').textContent=v.title;$('#vehicle-description').textContent=v.description;$('#vehicle-weight').textContent=v.weight;$('#truck-model').src='assets/truck-'+key+'.webp';$('#truck-model').alt=v.title;}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectVehicle(tab.dataset.vehicle));tab.addEventListener('keydown',e=>{let n=index;if(e.key==='ArrowRight')n=(index+1)%tabs.length;else if(e.key==='ArrowLeft')n=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=tabs.length-1;else return;e.preventDefault();selectVehicle(tabs[n].dataset.vehicle);tabs[n].focus();});});
const scrollRequest=()=>$('#request').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
$('#choose-vehicle').addEventListener('click',()=>{$('#auto-vehicle').checked=false;$('#weight').value=chosenVehicle;updateQuote();scrollRequest();});
document.querySelectorAll('[data-service]').forEach(card=>card.addEventListener('click',()=>{$('#service').value=card.dataset.service;$('#route-mode').value=card.dataset.service==='Междугородняя перевозка'?'intercity':'city';updateQuote();}));
document.querySelectorAll('[data-tariff]').forEach(card=>card.addEventListener('click',()=>{$('#auto-vehicle').checked=false;$('#weight').value=card.dataset.tariff;$('#route-mode').value='city';$('#service').value='Городская доставка';$('#hours').value=String(OTON_TARIFFS.vehicles[card.dataset.tariff].minimumHours);selectVehicle(card.dataset.tariff);updateQuote();}));
$('#service').addEventListener('change',()=>{if($('#service').value==='Междугородняя перевозка')$('#route-mode').value='intercity';if($('#service').value==='Городская доставка')$('#route-mode').value='city';});
$('#route-mode').addEventListener('change',()=>{if(['Городская доставка','Междугородняя перевозка'].includes($('#service').value))$('#service').value=$('#route-mode').value==='city'?'Городская доставка':'Междугородняя перевозка';});
function localISO(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
const today=new Date(),tomorrow=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1);$('#date').min=localISO(today);$('#date').value=localISO(tomorrow);$('#year').textContent=String(today.getFullYear());
['from','to','cargo'].forEach(id=>$('#'+id).addEventListener('input',()=>$('#'+id).setCustomValidity('')));
let cargoState={complete:false,items:[],unknown:[]},activeRoute=null,routeTicket=0,routeController=null,choiceCancel=null;
const routing=OTONRouting.createClient();
const decimal=(n,d=1)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:d}).format(n);
function cargoLabel(){if(!cargoState.complete)return 'Нужно уточнить массу';return cargoState.minKg===cargoState.maxKg?decimal(cargoState.maxKg)+' кг':decimal(cargoState.minKg)+'–'+decimal(cargoState.maxKg)+' кг';}
function refreshCargo(){
 const manual=$('#cargo-weight').value.trim();
 if(manual){const kg=Number(manual);cargoState=Number.isFinite(kg)&&kg>0&&kg<=1000000?{complete:true,provided:true,minKg:kg,maxKg:kg,minM3:0,maxM3:0,items:[],unknown:[]}: {complete:false,items:[],unknown:['Проверьте общий вес']};}
 else cargoState=OTONCargo.estimateCargo($('#cargo').value);
 const panel=$('#cargo-estimate');panel.replaceChildren();const title=document.createElement('strong'),detail=document.createElement('small');
 if(cargoState.complete){title.textContent=(cargoState.provided?'Указанная масса: ':'Ориентировочная масса: ')+cargoLabel();detail.textContent=cargoState.maxM3>0?'Объём примерно '+decimal(cargoState.minM3)+'–'+decimal(cargoState.maxM3)+' м³. Машину подбираем по верхней границе.':'Габариты и объём нужно уточнить отдельно.';}
 else{title.textContent=$('#cargo').value.trim()?'Нужны подробности о грузе':'Опишите вещи — оценим массу и объём.';detail.textContent=cargoState.unknown?.length?'Уточните в описании: '+cargoState.unknown.slice(0,3).join('; ')+'. Укажите количество или общий вес в «Дополнительных параметрах».':'Например: 1 диван, 1 холодильник, 10 коробок. Для своих значений: «10 коробок по 8 кг».';}
 panel.append(title,detail);
 if($('#auto-vehicle').checked){const key=OTONCargo.chooseVehicle(cargoState,OTON_TARIFFS.vehicles);$('#weight').value=key;if(key!=='unknown')selectVehicle(key);}
}
function inputs(){return {vehicle:$('#weight').value,mode:$('#route-mode').value,distance:$('#distance').value,hours:$('#hours').value,tolls:$('#tolls').value,loaders:$('[name="extras"][value="Грузчики"]').checked,loaderCount:$('#loader-count').value,loaderHours:$('#loader-hours').value,packing:$('[name="extras"][value="Упаковка"]').checked,assembly:$('[name="extras"][value="Разборка мебели"]').checked,flexible:$('#flexible-date').checked,cargoKg:cargoState.complete?cargoState.maxKg:0,cargoM3:cargoState.complete?cargoState.maxM3:0,fuelPrice:$('#fuel-price').value};}
let lastQuote=null;
function updateQuote(){
 refreshCargo();
 const data=inputs(),city=data.mode==='city',v=OTON_TARIFFS.vehicles[data.vehicle];
 $('#selected-vehicle').textContent=cargoState.complete?(v?'Машина для расчёта: '+vehicles[data.vehicle].title+' · '+vehicles[data.vehicle].weight:'Для этого груза нужен индивидуальный подбор машины.'):'Машину подберём автоматически по вашему грузу.';
 $('#distance').max=city?'150':'20000';
 $('#hours-label').textContent=city?'Машина на заказе, ч':'Погрузка и разгрузка, ч';
 $('#hours-help').textContent=city?`Время включает поездку, ожидание, погрузку и разгрузку. По расстоянию оно может увеличиться. Минимум ${v?v.minimumHours:'2–4'} ч; в тарифе до ${OTON_TARIFFS.cityIncludedKm} км. Километраж берётся из маршрута в одну сторону.`:'В тарифе 2 часа на погрузку и разгрузку. Километраж рассчитывается по автомобильной дороге. Учтены подача и расчётный пустой возврат; сроки движения ориентировочные.';
 $('#loader-fields').hidden=!data.loaders;$('#loader-count').disabled=!data.loaders;$('#loader-hours').disabled=!data.loaders;$('#loader-hours').required=data.loaders;
 lastQuote=cargoState.complete?OTONPricing.calculateQuote(data,OTON_TARIFFS):{available:false,message:'Опишите распознаваемые вещи и их количество или укажите известный общий вес. Пока масса не уточнена, цена и топливо не фиксируются.'};
 const total=$('#quote-total'),lines=$('#quote-lines');lines.replaceChildren();
 total.classList.toggle('quote-pending',!lastQuote.available);
 if(!lastQuote.available){$('#fuel-note').textContent='Топливо рассчитывается после маршрута и уточнения массы. Цена за литр — расчётное допущение, не онлайн-прайс АЗС. Топливо входит в цену перевозки.';for(const id of ['fuel-oneway','fuel-total','fuel-consumption','fuel-cost'])$('#'+id).textContent='—';total.textContent=data.vehicle==='unknown'&&cargoState.complete?'Индивидуально':'Нужны детали';$('#quote-note').textContent=lastQuote.message;return;}
 total.textContent=money(lastQuote.total);
 const fuel=lastQuote.fuel;$('#fuel-oneway').textContent=decimal(fuel.outboundLiters)+' л';$('#fuel-total').textContent=decimal(fuel.liters)+' л';$('#fuel-consumption').textContent=decimal(fuel.consumption)+' л/100 км';$('#fuel-cost').textContent=money(fuel.cost);$('#fuel-note').textContent=`${fuel.type}: ${decimal(fuel.price)} ₽/л — расчётное значение. На весь рейс: дорога с грузом, пустой возврат (${decimal(Number(data.distance)*OTON_TARIFFS.assumedReturnShare)} км), подача, ожидание и резерв ${OTON_TARIFFS.fuelReservePct}%. Топливо уже учтено в цене. Реальный расход зависит от машины, погоды и движения.`;
 for(const line of lastQuote.lines){const row=document.createElement('div');row.className='quote-line'+(line.amount<0?' discount':'');const name=document.createElement('span'),amount=document.createElement('span');name.textContent=line.label;amount.textContent=(line.amount<0?'−':'')+money(Math.abs(line.amount));row.append(name,amount);lines.append(row);}
 let note=`В расчёте ${lastQuote.billedHours} ч${city?' на заказе':' погрузки и разгрузки'}. `+'Предварительный расчёт. Итоговая цена фиксируется после проверки адресов, габаритов и условий погрузки.';
 if(data.flexible)note=lastQuote.discount>0?`За гибкую дату учтена скидка ${money(lastQuote.discount)}. `+note:'Гибкая дата отмечена. Автоматическая скидка для этих условий недоступна. '+note;
 $('#quote-note').textContent=note;
}
$('#request-form').addEventListener('invalid',event=>{const section=event.target.closest('details');if(section)section.open=true;},true);
$('#request-form').addEventListener('input',updateQuote);$('#request-form').addEventListener('change',updateQuote);
for(const [key,v]of Object.entries(OTON_TARIFFS.vehicles)){
 const minimum=OTONPricing.calculateQuote({vehicle:key,mode:'city',distance:OTON_TARIFFS.cityIncludedKm,hours:v.minimumHours,tolls:0},OTON_TARIFFS);
 document.querySelector(`[data-city-min="${key}"]`).textContent=minimum.available?new Intl.NumberFormat('ru-RU').format(minimum.total):'—';
 document.querySelector(`[data-city-description="${key}"]`).textContent=`Подача + ${v.minimumHours} ч, до ${OTON_TARIFFS.cityIncludedKm} км по городу`;
 document.querySelector(`[data-hour-rate="${key}"]`).textContent=money(v.cityHourly);
 document.querySelector(`[data-km-rate="${key}"]`).textContent=money(v.intercityKm)+'/км';
}
let requestText='';const dialog=$('#request-dialog');
$('#request-form').addEventListener('submit',e=>{
 e.preventDefault();const from=$('#from').value.trim(),to=$('#to').value.trim(),cargo=$('#cargo').value.trim();
 if(!from||!to||!cargo){const input=!from?$('#from'):!to?$('#to'):$('#cargo');input.setCustomValidity('Пожалуйста, заполните это поле.');input.reportValidity();return;}
 if(from.toLocaleLowerCase()===to.toLocaleLowerCase()){const input=$('#to');input.setCustomValidity('Уточните разные адреса отправления и доставки.');input.reportValidity();return;}
 updateQuote();const q=lastQuote,data=inputs();
 if(!$('#distance').validity.valid)$('#calc-options').open=true;
 if(!data.distance||!Number.isFinite(Number(data.distance))||Number(data.distance)<1||!$('#distance').validity.valid){$('#route-status').textContent='Нажмите «Рассчитать стоимость» или укажите километраж в дополнительных параметрах.';$('#route-status').classList.add('error');$('#calculate-route').focus();return;}
 const extras=[...document.querySelectorAll('[name=extras]:checked')].map(i=>i.value);
 const formattedDate=$('#date').value.split('-').reverse().join('.');
 const text=['ТК OTON — ЗАЯВКА С РАСЧЁТОМ','',`Откуда: ${from}`,`Куда: ${to}`,`Перевозка: ${$('#service').value}`,`Формат: ${data.mode==='city'?'По городу':'Межгород'}`,`Расстояние в одну сторону: ${data.distance} км`,`Дата: ${formattedDate}`,`Гибкая дата ±1 день: ${data.flexible?'да':'нет'}`,`Машина: ${$('#weight').selectedOptions[0].textContent}`,`Масса груза: ${cargoLabel()}`,`Груз: ${cargo}`,`${data.mode==='city'?'Машина на заказе':'Погрузка и разгрузка'}: ${data.hours} ч`];
 if(q.available){text.push(`Расчётное оплачиваемое время: ${q.billedHours} ч`);if(data.loaders)text.push(`Грузчики: ${q.loaders} чел. × ${q.loaderHours} ч`);}
 text.push(`Дополнительно: ${extras.length?extras.join(', '):'не требуется'}`);
 text.push(`Километраж: ${activeRoute?'OSRM / OpenStreetMap, до целого км вверх':'указан вручную'}`);
 if(activeRoute)text.push(`Уточнённые точки: ${activeRoute.from.label} → ${activeRoute.to.label}`,`Движение без остановок: ориентировочно ${decimal(activeRoute.durationHours)} ч; грузовые ограничения проверяются отдельно.`);
 if(cargoState.complete&&cargoState.maxM3>0)text.push(`Ориентировочный объём: ${decimal(cargoState.minM3)}–${decimal(cargoState.maxM3)} м³`);
 if(q.available)text.push(`Топливо ${q.fuel.type}: до выгрузки ≈ ${decimal(q.fuel.outboundLiters)} л; весь рейс с резервом ≈ ${decimal(q.fuel.liters)} л.`,`Расчётная цена топлива: ${decimal(q.fuel.price)} ₽/л. Бюджет ${money(q.fuel.cost)} уже учтён в итоговой цене.`);
 if($('#comment').value.trim())text.push(`Комментарий: ${$('#comment').value.trim()}`);
 text.push('','СОСТАВ ПРЕДВАРИТЕЛЬНОЙ СТОИМОСТИ');
 if(q.available){for(const line of q.lines)text.push(`${line.label}: ${line.amount<0?'−':''}${money(Math.abs(line.amount))}`);text.push(`ИТОГО ПРЕДВАРИТЕЛЬНО: ${money(q.total)}`);}else{text.push('Индивидуальный расчёт: '+q.message);}
 text.push('','Цена фиксируется после согласования деталей. Заявка ещё не отправлена.');
 requestText=text.join('\n');$('#request-summary').textContent=requestText;$('#copy-status').textContent='';dialog.showModal();
});
$('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('#copy-request').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(requestText);$('#copy-status').textContent='Заявка скопирована.';}catch{const range=document.createRange();range.selectNodeContents($('#request-summary'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);$('#copy-status').textContent='Выделили текст — скопируйте его через меню устройства.';}});
$('#download-request').addEventListener('click',()=>{const blob=new Blob(['\ufeff'+requestText],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='TK-OTON-zayavka.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#copy-status').textContent='Скачивание заявки началось.';});

function invalidateRoute(){routeTicket++;routeController?.abort();routeController=null;choiceCancel?.();activeRoute=null;$('#distance').value='';$('#distance').readOnly=true;$('#manual-distance').checked=false;$('#resolved-route').hidden=true;$('#route-status').textContent='Адреса изменены — рассчитайте маршрут заново.';$('#route-status').classList.remove('error');$('#calculate-route').disabled=false;$('#calculate-route').firstChild.textContent='Рассчитать стоимость ';}
function addressChoices(from,to,fromQuery,toQuery,signal){
 const a=OTONRouting.uniqueExact(fromQuery,from),b=OTONRouting.uniqueExact(toQuery,to);if(a&&b)return Promise.resolve([a,b]);
 const modal=$('#address-dialog');
 function fill(id,list,exact){const select=$(id);select.replaceChildren();if(!exact){const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Выберите нужный адрес';select.append(placeholder);}list.forEach((p,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=p.label;select.append(option);});if(exact)select.value=String(list.indexOf(exact));}
 fill('#address-from',from,a);fill('#address-to',to,b);modal.showModal();
 return new Promise((resolve,reject)=>{
  let done=false;const cancel=()=>finish(null);const onSubmit=e=>{e.preventDefault();finish([from[Number($('#address-from').value)],to[Number($('#address-to').value)]]);};
  function finish(value){if(done)return;done=true;$('#address-choice-form').removeEventListener('submit',onSubmit);$('#cancel-address').removeEventListener('click',cancel);modal.removeEventListener('cancel',cancel);signal.removeEventListener('abort',cancel);choiceCancel=null;modal.close();value?resolve(value):reject(new DOMException('Отменено','AbortError'));}
  choiceCancel=cancel;$('#address-choice-form').addEventListener('submit',onSubmit);$('#cancel-address').addEventListener('click',cancel);modal.addEventListener('cancel',cancel);signal.addEventListener('abort',cancel,{once:true});
 });
}
function drawRoute(points){const valid=points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));if(valid.length<2){$('#route-preview').style.display='none';return;}$('#route-preview').style.display='block';const xs=valid.map(p=>p[0]),ys=valid.map(p=>-p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);const scale=Math.min(460/Math.max(.001,maxX-minX),110/Math.max(.001,maxY-minY));const coords=valid.map(p=>[250+(p[0]-(minX+maxX)/2)*scale,75+(-p[1]-(minY+maxY)/2)*scale]);$('#calculated-path').setAttribute('d',coords.map((p,i)=>(i?'L':'M')+p.map(n=>n.toFixed(2)).join(' ')).join(' '));for(const [id,p]of [['#route-start',coords[0]],['#route-end',coords[coords.length-1]]]){$(id).setAttribute('cx',p[0]);$(id).setAttribute('cy',p[1]);}}
async function calculateRoute(){
 const cargo=$('#cargo');if(!cargo.value.trim()){cargo.setCustomValidity('Опишите груз и укажите количество.');cargo.reportValidity();return;}
 const from=$('#from').value.trim(),to=$('#to').value.trim();if(from.length<2||to.length<2){$('#route-status').textContent='Введите оба адреса в России.';$('#route-status').classList.add('error');return;}
 if($('#manual-distance').checked){const field=$('#distance');if(!field.value||!field.validity.valid){$('#calc-options').open=true;field.focus();$('#route-status').textContent='Укажите корректный километраж в одну сторону.';$('#route-status').classList.add('error');return;}updateQuote();$('#route-status').textContent='Расчёт по указанному километражу: '+field.value+' км в одну сторону.';$('#route-status').classList.remove('error');return;}
 invalidateRoute();const ticket=routeTicket;const ctl=new AbortController();routeController=ctl;$('#calculate-route').disabled=true;$('#calculate-route').firstChild.textContent='Считаем стоимость… ';$('#route-status').textContent='Находим адреса и автомобильную дорогу…';
 try{const starts=await routing.places(from,ctl.signal),ends=await routing.places(to,ctl.signal);const [a,b]=await addressChoices(starts,ends,from,to,ctl.signal);if(ticket!==routeTicket)return;const result=await routing.route(a,b,ctl.signal);if(ticket!==routeTicket)return;activeRoute={...result,from:a,to:b};$('#distance').value=String(result.distanceKm);$('#distance').readOnly=true;$('#manual-distance').checked=false;const sameCity=a.city&&b.city&&OTONRouting.normalize(a.city)===OTONRouting.normalize(b.city);$('#route-mode').value=sameCity&&result.distanceKm<=150?'city':'intercity';if(['Городская доставка','Междугородняя перевозка'].includes($('#service').value))$('#service').value=$('#route-mode').value==='city'?'Городская доставка':'Междугородняя перевозка';$('#route-status').textContent=`По дороге: ${decimal(result.rawKm)} км · ориентировочно ${decimal(result.durationHours)} ч в движении. Для расчёта округлено до ${result.distanceKm} км.`;$('#resolved-addresses').textContent=a.label+' → '+b.label;$('#resolved-route').hidden=false;drawRoute(result.geometry);updateQuote();}
 catch(error){if(ticket!==routeTicket)return;$('#route-status').textContent=error.name==='AbortError'?(ctl.signal.aborted?'Расчёт отменён.':'Не удалось завершить расчёт. Повторите или введите расстояние вручную.'):error.message;$('#route-status').classList.add('error');}
 finally{if(ticket===routeTicket){$('#calculate-route').disabled=false;$('#calculate-route').firstChild.textContent='Рассчитать стоимость ';routeController=null;}}
}
$('#calculate-route').addEventListener('click',calculateRoute);
['from','to'].forEach(id=>$('#'+id).addEventListener('input',()=>invalidateRoute()));
$('#manual-distance').addEventListener('change',()=>{const manual=$('#manual-distance').checked;invalidateRoute();$('#manual-distance').checked=manual;$('#distance').readOnly=!manual;if(manual)$('#distance').focus();$('#route-status').textContent=manual?'Введите километраж в одну сторону.':'Нажмите «Рассчитать стоимость» — определим километраж по дороге.';updateQuote();});
$('#distance').addEventListener('input',()=>{activeRoute=null;$('#resolved-route').hidden=true;$('#route-status').textContent='Километраж указан вручную.';});
$('#cargo').addEventListener('input',()=>{$('#cargo-weight').value='';});
$('#weight').addEventListener('change',()=>{$('#auto-vehicle').checked=false;});
$('#fuel-price').value=String(OTON_TARIFFS.fuelPrice);selectVehicle('small');updateQuote();
