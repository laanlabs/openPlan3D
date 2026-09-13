import { expect, it } from 'vitest';
import { formatLength, formatLengthPrecise } from '$lib/stores/settings';
it.each([[11.49,'11"'],[11.51,"1'"],[23.8,"2'"],[119.9,"10'"],[-23.8,"-2'"],[-.1,'0"']] as const)('carries rounded whole inches for %s inches', (inches,label)=>{
 expect(formatLength(inches*2.54,'imperial')).toBe(label);
});
it.each([[11.94,'11.9"'],[11.96,'1\'0.0"'],[23.96,'2\'0.0"'],[-23.96,'-2\'0.0"'],[-.01,'0.0"']] as const)('carries rounded tenths for %s inches', (inches,label)=>{
 expect(formatLengthPrecise(inches*2.54,'imperial')).toBe(label);
});
it('keeps every rounded inch remainder below twelve across repeated boundaries',()=>{
 for(let tenths=0;tenths<5000;tenths++){
  for(const text of [formatLength(tenths/10*2.54,'imperial'),formatLengthPrecise(tenths/10*2.54,'imperial')]){
   const match=text.match(/(?:^|')([\d.]+)"$/);if(match)expect(Number(match[1])).toBeLessThan(12);
  }
 }
 expect(formatLength(125,'metric')).toBe('1.25 m');expect(formatLengthPrecise(125,'metric')).toBe('1.25 m');
});
