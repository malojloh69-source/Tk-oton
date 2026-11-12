/* costKm — только износ и обслуживание, БЕЗ топлива.
   СТАРТОВАЯ МОДЕЛЬ, а не подтверждённая экономика OTON.
   До приёма оплаченных заказов замените условные расходы на свои.
   Этот файл доступен посетителям сайта: не размещайте здесь секреты. */
(function(root){
'use strict';
const config={
  currency:'RUB', reservePct:10, revenueDeductionsPct:8,
  targetMarginPct:25, minimumMarginPct:20, flexibleDiscountPct:5,
  rounding:50, assumedReturnShare:1, planningHoursPerDay:10,
  cityIncludedKm:30, cityHandlingHours:1, fuelPrice:85, fuelReservePct:10,
  vehicles:{
    small:{name:'До 1,5 тонн',cityHourly:1200,minimumHours:2,dispatchPrice:600,cityExtraKm:35,intercityKm:65,intercityMinimum:3500,costKm:3,capacityKg:1500,capacityM3:16,fuelType:'ДТ',fuelEmpty:11,fuelFull:16,fuelIdle:0.8,costHour:250,dispatchCost:200,positioningKm:15,positioningHours:0.5,cityAverageSpeed:30,averageSpeed:60,overnightCost:800},
    medium:{name:'До 5 тонн',cityHourly:1800,minimumHours:3,dispatchPrice:1000,cityExtraKm:50,intercityKm:95,intercityMinimum:8000,costKm:6,capacityKg:5000,capacityM3:35,fuelType:'ДТ',fuelEmpty:18,fuelFull:25,fuelIdle:1.2,costHour:400,dispatchCost:450,positioningKm:20,positioningHours:0.5,cityAverageSpeed:25,averageSpeed:55,overnightCost:1500},
    large:{name:'До 20 тонн',cityHourly:3000,minimumHours:4,dispatchPrice:1800,cityExtraKm:80,intercityKm:150,intercityMinimum:18000,costKm:11,capacityKg:20000,capacityM3:82,fuelType:'ДТ',fuelEmpty:26,fuelFull:35,fuelIdle:1.8,costHour:550,dispatchCost:900,positioningKm:30,positioningHours:0.75,cityAverageSpeed:22,averageSpeed:50,overnightCost:2500}
  },
  extras:{loaderHourly:900,loaderCostHourly:500,loaderMinimumHours:2,packingPrice:600,packingCost:300,assemblyPrice:1200,assemblyCost:600}
};
root.OTON_TARIFFS=config;
if(typeof module==='object'&&module.exports)module.exports=config;
})(typeof globalThis!=='undefined'?globalThis:this);
