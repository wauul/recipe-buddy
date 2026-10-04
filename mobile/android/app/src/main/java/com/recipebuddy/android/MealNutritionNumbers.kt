package com.recipebuddy.android

// Accept the decimal separator used by both supported locales. Invalid entered
// bounds must never become an omitted prescription bound.
internal fun nutritionInputNumber(value:String):Double? = value.trim().replace(',','.').toDoubleOrNull()?.takeIf{it.isFinite()&&it>=0&&it<=100000}
internal fun nutritionBoundsValid(minimum:String,maximum:String):Boolean {
 val low=nutritionInputNumber(minimum);val high=nutritionInputNumber(maximum)
 return (minimum.isBlank()||low!=null)&&(maximum.isBlank()||high!=null)&&(low!=null||high!=null)&&(low==null||high==null||low<=high)
}
