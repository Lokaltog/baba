/*!
 * Baba dynamic site text by Lokaltog
 *
 * Made with Baba: http://baba.computer/
 */
!function(e,r){"function"==typeof define&&define.amd?define([],r):"object"==typeof exports?module.exports=r():e.Baba=r()}(this,function(){var e={},r=function(e){return e[Math.floor(Math.random()*e.length)]},n=function(e){for(var r,n,t=e.length;t;r=Math.floor(Math.random()*t),n=e[--t],e[t]=e[r],e[r]=n);return e},t=function(e){return e.split("|")},o=function(){return function(e){var t,a,i,s="",u={};for(a in e)t=e[a],Array.isArray(t)&&(n(t),u[e.indexOf(t)]=0);for(a in e)t=e[a],i=typeof t,"string"===i?s+=t:"function"===i?s+=o(t())():Array.isArray(t)&&(s+=o(t[u[e.indexOf(t)]++]||r(t))());return s.trim()}.bind(this,[].slice.call(arguments))},a=function(){return function(e,r){var n,t=o(e)();return r.forEach(function(e){e.some(function(e){return"function"==typeof e?void(t=e(t)):(n=RegExp(e[0],"ig"),t.match(n)?(t=t.replace(n,e[1]),!0):void 0)})}),t}.bind(this,arguments[0],[].slice.call(arguments,1))},i=" ",s=t("build|construct|create|design|develop|devise|fabricate|fashion|forge|form|generate|make|produce|shape"),u=t("crap|garbage|junk|nonsense|rubbish|trash"),c=t("article|book|document|narrative|novel|story|text|writing"),l=[["^(.*)([^ou])y$","$1$2ies"],["^(.*)$","$1s"]],f=o(s,i,u,i,a(c,l)),h=t("affirmative|all according to plan|allright|awesome|confirmed|copy that|finally|got it|great|it's all coming together|neat|nice|roger that|sweet"),m=[function(e){return e.charAt(0).toUpperCase()+e.substr(1)}],d=o(a(h,m),"!"),g=t("aw man|bummer|crap|dammit|engage panic mode|let me try again|oh god no|oh no|seriously?|why me?|why?"),y=o(a(g,m),"!"),p=t("amazing|awesome|best|excellent|fabulous|fantabulous|fantastic|formidable|great|impressive|marvelous|outstanding|preeminent|stunning|superb|terrific|wonderful"),b=[["^(.*?)e?$","$1est"]],v=[["^(.*?)[aeiouy]?$","$1er"]],$=t("ever|ever made|in the universe|in the world|of all time|on the internets|there is"),w=o("The",i,a(p,b),i,u,i,c,i,a(s,v),i,$),x=t("baron|count|dr.|duke|earl|general|gov.|lord|pres.|prof.|sir"),k=t("archibald|arthur|cornelius|cyrus|emmett|ezekiel|hudson|malachi|montgomery|q.|quincy|rex|sinclair|theodore|v.|w.|x.|y.|z."),j=o([o(x,i,k,i,k,i,k,i,k),o(x,i,k,i,k,i,k,i,k),o(k,i,k,i,k,i,k)]),A=[function(e){return e.replace(/\w\S*/g,function(e){return["von"].indexOf(e)>-1?e:e.charAt(0).toUpperCase()+e.substr(1)})}],O=o([o(j,i,"mc",a(p,A)),o(j,i,"mac",a(p,A)),o(j,i,"von",i,p),o(j,i,"de",a(p,A))]),M=[["^(.*?)[aeiouy]?(ing|ive)?$","$1ington"]],U=[["^(.*?)[aeiouy]?$","$1hurst"]],q=[["^(.*)$","$1burg"]],z=[["^(.*?)[aeiouy]?$","$1edelacroix"]],C=o([o(O),o(a(O,M)),o(a(O,U)),o(a(O,q)),o(a(O,z))]),E=t("esq|jr|m. d|ph. d|sr"),B=t("ii|iii|iv"),R=[function(e){return e.toUpperCase()}],S=o([o(a(C,A),",",i,a(E,A),"."),o(a(C,A),i,a(B,R))]),T=t("... or not|fuck that|i changed my mind|maybe later|nah|never mind|no|no thanks|no way|no, thank you|screw that"),I=o(a(T,m),"!"),L=t("absolutely|fuck yes|hell yeah|i'm positive|of course|oh, yes|sure|why not|yeah|yes please|yes, sir|yup"),V=o(a(L,m),"!");return{generator:{catchphrase:f,confirm:d,error:y,generator:w,name:S,no:I,yes:V},variable:{obj:e,set:function(r,n){e[r]=n}}}});