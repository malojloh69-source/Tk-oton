(function(root){
'use strict';
function failure(message){return {available:false,message};}
function number(value){if(!['number','string'].includes(typeof value)||(typeof value==='string'&&!value.trim()))return NaN;return Number(value);}
function calculateQuote(input,config){
  if(!config||!config.vehicles||!config.extras)return failure('Тарифы временно недоступны. Нужен индивидуальный расчёт.');
  const v=Object.hasOwn(config.vehicles,input.vehicle)?config.vehicles[input.vehicle]:null;
  if(!v)return failure('Уточним вес и габариты — подготовим индивидуальный расчёт.');
  const cargoKg=number(input.cargoKg??0),cargoM3=number(input.cargoM3??0),fuelPrice=number(input.fuelPrice??config.fuelPrice);
  if(!Number.isFinite(cargoKg)||cargoKg<0||!Number.isFinite(cargoM3)||cargoM3<0)return failure('Уточните массу и объём груза.');
  if(cargoKg>v.capacityKg||cargoM3>v.capacityM3)return failure('Этот груз превышает расчётную вместимость выбранной машины. Нужен другой транспорт или несколько рейсов.');
  if(!Number.isFinite(fuelPrice)||fuelPrice<1||fuelPrice>1000)return failure('Укажите расчётную цену топлива от 1 до 1 000 ₽ за литр.');
  const distance=number(input.distance),hours=number(input.hours),tolls=number(input.tolls??0);
  if(!['city','intercity'].includes(input.mode))return failure('Выберите формат маршрута.');
  if(!Number.isFinite(distance)||distance<1||distance>20000)return failure('Укажите расстояние по дороге: от 1 до 20 000 км.');
  if(!Number.isFinite(hours)||hours<0.5||hours>72)return failure('Укажите время от 0,5 до 72 часов.');
  if(!Number.isFinite(tolls)||tolls<0||tolls>1000000)return failure('Укажите расходы на дороги и парковку от 0 до 1 000 000 ₽.');
  if(input.mode==='city'&&distance>150)return failure('Для маршрута свыше 150 км выберите «Межгород» или уточните расчёт.');
  const nonnegative=['reservePct','revenueDeductionsPct','targetMarginPct','minimumMarginPct','flexibleDiscountPct','assumedReturnShare','cityIncludedKm','cityHandlingHours','fuelReservePct','fuelPrice'];
  const vNonnegative=['cityHourly','dispatchPrice','cityExtraKm','intercityKm','intercityMinimum','costKm','costHour','dispatchCost','positioningKm','positioningHours','overnightCost','capacityKg','capacityM3','fuelEmpty','fuelFull','fuelIdle'];
  const extraKeys=['loaderHourly','loaderCostHourly','packingPrice','packingCost','assemblyPrice','assemblyCost'];
  if(nonnegative.some(k=>!Number.isFinite(config[k])||config[k]<0)||vNonnegative.some(k=>!Number.isFinite(v[k])||v[k]<0)||extraKeys.some(k=>!Number.isFinite(config.extras[k])||config.extras[k]<0)||!Number.isFinite(config.rounding)||config.rounding<=0||!Number.isFinite(config.planningHoursPerDay)||config.planningHoursPerDay<=0||!Number.isFinite(v.averageSpeed)||v.averageSpeed<=0||!Number.isFinite(v.cityAverageSpeed)||v.cityAverageSpeed<=0||!Number.isFinite(v.minimumHours)||v.minimumHours<=0||!Number.isFinite(config.extras.loaderMinimumHours)||config.extras.loaderMinimumHours<=0||v.capacityKg<=0||v.capacityM3<=0||v.fuelFull<v.fuelEmpty||config.assumedReturnShare>1||config.flexibleDiscountPct>100||config.minimumMarginPct>config.targetMarginPct||config.revenueDeductionsPct+config.targetMarginPct>=100)return failure('Нужен индивидуальный расчёт: проверьте настройки тарифа.');
  const ceilHalf=n=>Math.ceil(n*2)/2;
  const round=n=>Math.ceil((n-1e-8)/config.rounding)*config.rounding;
  const billedHours=input.mode==='city'?Math.max(v.minimumHours,ceilHalf(hours),ceilHalf(distance/v.cityAverageSpeed+config.cityHandlingHours)):Math.max(2,ceilHalf(hours));
  const vehicleKm=distance*(1+config.assumedReturnShare)+v.positioningKm;
  const distanceCost=vehicleKm*v.costKm;
  const loadRatio=cargoKg>0?Math.min(1,cargoKg/v.capacityKg):0.5;
  const consumption=v.fuelEmpty+(v.fuelFull-v.fuelEmpty)*loadRatio;
  const idleHours=input.mode==='city'?Math.max(0,billedHours-distance/v.cityAverageSpeed):billedHours;
  const outboundLiters=distance*consumption/100;
  const returnLiters=distance*config.assumedReturnShare*v.fuelEmpty/100;
  const positioningLiters=v.positioningKm*v.fuelEmpty/100;
  const idleLiters=idleHours*v.fuelIdle;
  const baseLiters=outboundLiters+returnLiters+positioningLiters+idleLiters;
  const fuelLiters=baseLiters*(1+config.fuelReservePct/100);
  const fuelCost=fuelLiters*fuelPrice;
  const operatingHours=input.mode==='city'?billedHours+distance*config.assumedReturnShare/v.cityAverageSpeed+v.positioningHours:distance*(1+config.assumedReturnShare)/v.averageSpeed+billedHours+v.positioningHours;
  const overnightDays=input.mode==='intercity'?Math.max(0,Math.ceil(operatingHours/config.planningHoursPerDay)-1):0;
  const transportCost=fuelCost+distanceCost+operatingHours*v.costHour+v.dispatchCost+overnightDays*v.overnightCost;
  let transportMarket=input.mode==='city'?v.dispatchPrice+billedHours*v.cityHourly+Math.max(0,distance-config.cityIncludedKm)*v.cityExtraKm:Math.max(v.intercityMinimum,v.dispatchPrice+distance*v.intercityKm+Math.max(0,billedHours-2)*v.cityHourly);
  const lines=[];let extrasPrice=0,extrasCost=0;
  let loaderHours=0,loaders=0;
  if(input.loaders){
    loaders=number(input.loaderCount);loaderHours=number(input.loaderHours);
    if(!Number.isInteger(loaders)||loaders<1||loaders>4||!Number.isFinite(loaderHours)||loaderHours<0.5||loaderHours>72)return failure('Для грузчиков укажите 1–4 человека и время от 0,5 до 72 часов.');
    loaderHours=Math.max(config.extras.loaderMinimumHours,ceilHalf(loaderHours));
    const amount=loaders*loaderHours*config.extras.loaderHourly;
    extrasPrice+=amount;extrasCost+=loaders*loaderHours*config.extras.loaderCostHourly;
    lines.push({label:`Грузчики: ${loaders} чел. × ${loaderHours} ч`,amount});
  }
  if(input.packing){extrasPrice+=config.extras.packingPrice;extrasCost+=config.extras.packingCost;lines.push({label:'Упаковка: стартовый комплект',amount:config.extras.packingPrice});}
  if(input.assembly){extrasPrice+=config.extras.assemblyPrice;extrasCost+=config.extras.assemblyCost;lines.push({label:'Базовая разборка одного предмета',amount:config.extras.assemblyPrice});}
  if(tolls>0){extrasPrice+=tolls;extrasCost+=tolls;lines.push({label:'Дороги и парковка',amount:tolls});}
  const rawCost=transportCost+extrasCost;
  const costWithReserve=rawCost*(1+config.reservePct/100);
  const targetFloor=round(costWithReserve/(1-(config.revenueDeductionsPct+config.targetMarginPct)/100));
  const minimumFloor=round(costWithReserve/(1-(config.revenueDeductionsPct+config.minimumMarginPct)/100));
  const beforeDiscount=round(Math.max(transportMarket+extrasPrice,targetFloor));
  if(!Number.isFinite(beforeDiscount)||beforeDiscount<=0)return failure('Нужен индивидуальный расчёт: проверьте настройки тарифа.');
  const total=input.flexible?Math.min(beforeDiscount,Math.max(round(beforeDiscount*(1-config.flexibleDiscountPct/100)),minimumFloor)):beforeDiscount;
  const discount=beforeDiscount-total;
  const marginPct=(total*(1-config.revenueDeductionsPct/100)-costWithReserve)/total*100;
  lines.unshift({label:input.mode==='city'?`Машина и маршрут · ${billedHours} ч`:`Машина и маршрут · ${distance} км`,amount:beforeDiscount-extrasPrice});
  if(discount>0)lines.push({label:'Гибкая дата',amount:-discount});
  return {available:true,total,beforeDiscount,discount,billedHours,loaderHours,loaders,lines,distance,mode:input.mode,rawCost,costWithReserve,minimumFloor,targetFloor,marginPct,assumedReturnShare:config.assumedReturnShare,overnightDays,fuel:{outboundLiters,returnLiters,positioningLiters,idleLiters,liters:fuelLiters,cost:fuelCost,price:fuelPrice,consumption,type:v.fuelType,vehicleKm}};
}
root.OTONPricing={calculateQuote};
if(typeof module==='object'&&module.exports)module.exports={calculateQuote};
})(typeof globalThis!=='undefined'?globalThis:this);
