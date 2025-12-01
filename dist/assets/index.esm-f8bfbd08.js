var e=(e,t,n)=>new Promise((i,o)=>{var r=e=>{try{a(n.next(e))}catch(t){o(t)}},s=e=>{try{a(n.throw(e))}catch(t){o(t)}},a=e=>e.done?i(e.value):Promise.resolve(e.value).then(r,s);a((n=n.apply(e,t)).next())});import{K as t,_ as n,L as i,M as o,N as r,O as s,P as a,Q as c,R as u,S as l,U as d,V as f,W as p}from"./firebase-vendor-a578dd95.js";const g="@firebase/installations",h="0.6.9",y=1e4,m=`w:${h}`,b="FIS_v2",w=36e5,v=new r("installations","Installations",{"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."});function k(e){return e instanceof s&&e.code.includes("request-failed")}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function S({projectId:e}){return`https://firebaseinstallations.googleapis.com/v1/projects/${e}/installations`}function I(e){return{token:e.token,requestStatus:2,expiresIn:(t=e.expiresIn,Number(t.replace("s","000"))),creationTime:Date.now()};var t}function T(t,n){return e(this,null,function*(){const e=(yield n.json()).error;return v.create("request-failed",{requestName:t,serverCode:e.code,serverMessage:e.message,serverStatus:e.status})})}function C({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function j(e,{refreshToken:t}){const n=C(e);return n.append("Authorization",function(e){return`${b} ${e}`}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(t)),n}function P(t){return e(this,null,function*(){const e=yield t();return e.status>=500&&e.status<600?t():e})}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function O(e){return new Promise(t=>{setTimeout(t,e)})}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const D=/^[cdef][\w-]{21}$/;function A(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const t=function(e){const t=(n=e,btoa(String.fromCharCode(...n)).replace(/\+/g,"-").replace(/\//g,"_"));var n;return t.substr(0,22)}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e);return D.test(t)?t:""}catch(e){return""}}function K(e){return`${e.appName}!${e.appId}`}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const M=new Map;function _(e,t){const n=K(e);E(n,t),function(e,t){const n=function(){!N&&"BroadcastChannel"in self&&(N=new BroadcastChannel("[Firebase] FID Change"),N.onmessage=e=>{E(e.data.key,e.data.fid)});return N}();n&&n.postMessage({key:e,fid:t});0===M.size&&N&&(N.close(),N=null)}(n,t)}function E(e,t){const n=M.get(e);if(n)for(const i of n)i(t)}let N=null;
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const x="firebase-installations-store";let $=null;function q(){return $||($=a("firebase-installations-database",1,{upgrade:(e,t)=>{if(0===t)e.createObjectStore(x)}})),$}function R(t,n){return e(this,null,function*(){const e=K(t),i=(yield q()).transaction(x,"readwrite"),o=i.objectStore(x),r=yield o.get(e);return yield o.put(n,e),yield i.done,r&&r.fid===n.fid||_(t,n.fid),n})}function F(t){return e(this,null,function*(){const e=K(t),n=(yield q()).transaction(x,"readwrite");yield n.objectStore(x).delete(e),yield n.done})}function H(t,n){return e(this,null,function*(){const e=K(t),i=(yield q()).transaction(x,"readwrite"),o=i.objectStore(x),r=yield o.get(e),s=n(r);return void 0===s?yield o.delete(e):yield o.put(s,e),yield i.done,!s||r&&r.fid===s.fid||_(t,s.fid),s})}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function L(t){return e(this,null,function*(){let n;const i=yield H(t.appConfig,i=>{const o=function(e){const t=e||{fid:A(),registrationStatus:0};return B(t)}(i),r=function(t,n){if(0===n.registrationStatus){if(!navigator.onLine){return{installationEntry:n,registrationPromise:Promise.reject(v.create("app-offline"))}}const i={fid:n.fid,registrationStatus:1,registrationTime:Date.now()},o=function(t,n){return e(this,null,function*(){try{const i=yield function(t,n){return e(this,arguments,function*({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const i=S(e),o=C(e),r=t.getImmediate({optional:!0});if(r){const e=yield r.getHeartbeatsHeader();e&&o.append("x-firebase-client",e)}const s={fid:n,authVersion:b,appId:e.appId,sdkVersion:m},a={method:"POST",headers:o,body:JSON.stringify(s)},c=yield P(()=>fetch(i,a));if(c.ok){const e=yield c.json();return{fid:e.fid||n,registrationStatus:2,refreshToken:e.refreshToken,authToken:I(e.authToken)}}throw yield T("Create Installation",c)})}(t,n);return R(t.appConfig,i)}catch(i){throw k(i)&&409===i.customData.serverCode?yield F(t.appConfig):yield R(t.appConfig,{fid:n.fid,registrationStatus:0}),i}})}(t,i);return{installationEntry:i,registrationPromise:o}}return 1===n.registrationStatus?{installationEntry:n,registrationPromise:V(t)}:{installationEntry:n}}(t,o);return n=r.registrationPromise,r.installationEntry});return""===i.fid?{installationEntry:yield n}:{installationEntry:i,registrationPromise:n}})}function V(t){return e(this,null,function*(){let e=yield W(t.appConfig);for(;1===e.registrationStatus;)yield O(100),e=yield W(t.appConfig);if(0===e.registrationStatus){const{installationEntry:e,registrationPromise:n}=yield L(t);return n||e}return e})}function W(e){return H(e,e=>{if(!e)throw v.create("installation-not-found");return B(e)})}function B(e){return 1===(t=e).registrationStatus&&t.registrationTime+y<Date.now()?{fid:e.fid,registrationStatus:0}:e;var t;
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}function U(t,n){return e(this,arguments,function*({appConfig:e,heartbeatServiceProvider:t},n){const i=function(e,{fid:t}){return`${S(e)}/${t}/authTokens:generate`}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e,n),o=j(e,n),r=t.getImmediate({optional:!0});if(r){const e=yield r.getHeartbeatsHeader();e&&o.append("x-firebase-client",e)}const s={installation:{sdkVersion:m,appId:e.appId}},a={method:"POST",headers:o,body:JSON.stringify(s)},c=yield P(()=>fetch(i,a));if(c.ok){return I(yield c.json())}throw yield T("Generate Auth Token",c)})}function G(t,n=!1){return e(this,null,function*(){let i;const o=yield H(t.appConfig,o=>{if(!J(o))throw v.create("not-registered");const r=o.authToken;if(!n&&function(e){return 2===e.requestStatus&&!function(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+w}(e)}(r))return o;if(1===r.requestStatus)return i=function(t,n){return e(this,null,function*(){let e=yield z(t.appConfig);for(;1===e.authToken.requestStatus;)yield O(100),e=yield z(t.appConfig);const i=e.authToken;return 0===i.requestStatus?G(t,n):i})}(t,n),o;{if(!navigator.onLine)throw v.create("app-offline");const n=function(e){const t={requestStatus:1,requestTime:Date.now()};return Object.assign(Object.assign({},e),{authToken:t})}(o);return i=function(t,n){return e(this,null,function*(){try{const e=yield U(t,n),i=Object.assign(Object.assign({},n),{authToken:e});return yield R(t.appConfig,i),e}catch(e){if(!k(e)||401!==e.customData.serverCode&&404!==e.customData.serverCode){const e=Object.assign(Object.assign({},n),{authToken:{requestStatus:0}});yield R(t.appConfig,e)}else yield F(t.appConfig);throw e}})}(t,n),n}});return i?yield i:o.authToken})}function z(e){return H(e,e=>{if(!J(e))throw v.create("not-registered");const t=e.authToken;return 1===(n=t).requestStatus&&n.requestTime+y<Date.now()?Object.assign(Object.assign({},e),{authToken:{requestStatus:0}}):e;var n;
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */})}function J(e){return void 0!==e&&2===e.registrationStatus}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function Q(t,n=!1){return e(this,null,function*(){const i=t;yield function(t){return e(this,null,function*(){const{registrationPromise:e}=yield L(t);e&&(yield e)})}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(i);return(yield G(i,n)).token})}function Y(e){return v.create("missing-app-config-values",{valueName:e})}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const X="installations",Z=t=>{const n=t.getProvider("app").getImmediate(),i=o(n,X).getImmediate();return{getId:()=>function(t){return e(this,null,function*(){const e=t,{installationEntry:n,registrationPromise:i}=yield L(e);return i?i.catch(console.error):G(e).catch(console.error),n.fid})}(i),getToken:e=>Q(i,e)}};n(new i(X,e=>{const t=e.getProvider("app").getImmediate(),n=function(e){if(!e||!e.options)throw Y("App Configuration");if(!e.name)throw Y("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw Y(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}(t);return{app:t,appConfig:n,heartbeatServiceProvider:o(t,"heartbeat"),_delete:()=>Promise.resolve()}},"PUBLIC")),n(new i("installations-internal",Z,"PRIVATE")),t(g,h),t(g,h,"esm2017");
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const ee="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",te="google.c.a.c_id";var ne,ie,oe;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function re(e){const t=new Uint8Array(e);return btoa(String.fromCharCode(...t)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function se(e){const t=(e+"=".repeat((4-e.length%4)%4)).replace(/\-/g,"+").replace(/_/g,"/"),n=atob(t),i=new Uint8Array(n.length);for(let o=0;o<n.length;++o)i[o]=n.charCodeAt(o);return i}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(ie=ne||(ne={}))[ie.DATA_MESSAGE=1]="DATA_MESSAGE",ie[ie.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION",function(e){e.PUSH_RECEIVED="push-received",e.NOTIFICATION_CLICKED="notification-clicked"}(oe||(oe={}));const ae="fcm_token_details_db",ce="fcm_token_object_Store";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const ue="firebase-messaging-store";let le=null;function de(){return le||(le=a("firebase-messaging-database",1,{upgrade:(e,t)=>{if(0===t)e.createObjectStore(ue)}})),le}function fe(t){return e(this,null,function*(){const n=ge(t),i=yield de(),o=yield i.transaction(ue).objectStore(ue).get(n);if(o)return o;{const n=yield function(t){return e(this,null,function*(){if("databases"in indexedDB&&!(yield indexedDB.databases()).map(e=>e.name).includes(ae))return null;let n=null;return(yield a(ae,5,{upgrade:(i,o,r,s)=>e(this,null,function*(){var e;if(o<2)return;if(!i.objectStoreNames.contains(ce))return;const r=s.objectStore(ce),a=yield r.index("fcmSenderId").get(t);if(yield r.clear(),a)if(2===o){const t=a;if(!t.auth||!t.p256dh||!t.endpoint)return;n={token:t.fcmToken,createTime:null!==(e=t.createTime)&&void 0!==e?e:Date.now(),subscriptionOptions:{auth:t.auth,p256dh:t.p256dh,endpoint:t.endpoint,swScope:t.swScope,vapidKey:"string"==typeof t.vapidKey?t.vapidKey:re(t.vapidKey)}}}else if(3===o){const e=a;n={token:e.fcmToken,createTime:e.createTime,subscriptionOptions:{auth:re(e.auth),p256dh:re(e.p256dh),endpoint:e.endpoint,swScope:e.swScope,vapidKey:re(e.vapidKey)}}}else if(4===o){const e=a;n={token:e.fcmToken,createTime:e.createTime,subscriptionOptions:{auth:re(e.auth),p256dh:re(e.p256dh),endpoint:e.endpoint,swScope:e.swScope,vapidKey:re(e.vapidKey)}}}})})).close(),yield p(ae),yield p("fcm_vapid_details_db"),yield p("undefined"),function(e){if(!e||!e.subscriptionOptions)return!1;const{subscriptionOptions:t}=e;return"number"==typeof e.createTime&&e.createTime>0&&"string"==typeof e.token&&e.token.length>0&&"string"==typeof t.auth&&t.auth.length>0&&"string"==typeof t.p256dh&&t.p256dh.length>0&&"string"==typeof t.endpoint&&t.endpoint.length>0&&"string"==typeof t.swScope&&t.swScope.length>0&&"string"==typeof t.vapidKey&&t.vapidKey.length>0}(n)?n:null})}(t.appConfig.senderId);if(n)return yield pe(t,n),n}})}function pe(t,n){return e(this,null,function*(){const e=ge(t),i=(yield de()).transaction(ue,"readwrite");return yield i.objectStore(ue).put(n,e),yield i.done,n})}function ge({appConfig:e}){return e.appId}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const he=new r("messaging","Messaging",{"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."});function ye(t,n){return e(this,null,function*(){const e={method:"DELETE",headers:yield be(t)};try{const i=yield fetch(`${me(t.appConfig)}/${n}`,e),o=yield i.json();if(o.error){const e=o.error.message;throw he.create("token-unsubscribe-failed",{errorInfo:e})}}catch(i){throw he.create("token-unsubscribe-failed",{errorInfo:null==i?void 0:i.toString()})}})}function me({projectId:e}){return`https://fcmregistrations.googleapis.com/v1/projects/${e}/registrations`}function be(t){return e(this,arguments,function*({appConfig:e,installations:t}){const n=yield t.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e.apiKey,"x-goog-firebase-installations-auth":`FIS ${n}`})})}function we({p256dh:e,auth:t,endpoint:n,vapidKey:i}){const o={web:{endpoint:n,auth:t,p256dh:e}};return i!==ee&&(o.web.applicationPubKey=i),o}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ve(t){return e(this,null,function*(){const n=yield function(t,n){return e(this,null,function*(){const e=yield t.pushManager.getSubscription();return e||t.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:se(n)})})}(t.swRegistration,t.vapidKey),i={vapidKey:t.vapidKey,swScope:t.swRegistration.scope,endpoint:n.endpoint,auth:re(n.getKey("auth")),p256dh:re(n.getKey("p256dh"))},o=yield fe(t.firebaseDependencies);if(o){if(function(e,t){const n=t.vapidKey===e.vapidKey,i=t.endpoint===e.endpoint,o=t.auth===e.auth,r=t.p256dh===e.p256dh;return n&&i&&o&&r}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(o.subscriptionOptions,i))return Date.now()>=o.createTime+6048e5?function(t,n){return e(this,null,function*(){try{const i=yield function(t,n){return e(this,null,function*(){const e=yield be(t),i=we(n.subscriptionOptions),o={method:"PATCH",headers:e,body:JSON.stringify(i)};let r;try{const e=yield fetch(`${me(t.appConfig)}/${n.token}`,o);r=yield e.json()}catch(s){throw he.create("token-update-failed",{errorInfo:null==s?void 0:s.toString()})}if(r.error){const e=r.error.message;throw he.create("token-update-failed",{errorInfo:e})}if(!r.token)throw he.create("token-update-no-token");return r.token})}(t.firebaseDependencies,n),o=Object.assign(Object.assign({},n),{token:i,createTime:Date.now()});return yield pe(t.firebaseDependencies,o),i}catch(i){throw i}})}(t,{token:o.token,createTime:Date.now(),subscriptionOptions:i}):o.token;try{yield ye(t.firebaseDependencies,o.token)}catch(r){}return Se(t.firebaseDependencies,i)}return Se(t.firebaseDependencies,i)})}function ke(t){return e(this,null,function*(){const n=yield fe(t.firebaseDependencies);n&&(yield ye(t.firebaseDependencies,n.token),yield function(t){return e(this,null,function*(){const e=ge(t),n=(yield de()).transaction(ue,"readwrite");yield n.objectStore(ue).delete(e),yield n.done})}(t.firebaseDependencies));const i=yield t.swRegistration.pushManager.getSubscription();return!i||i.unsubscribe()})}function Se(t,n){return e(this,null,function*(){const i=
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */yield function(t,n){return e(this,null,function*(){const e=yield be(t),i=we(n),o={method:"POST",headers:e,body:JSON.stringify(i)};let r;try{const e=yield fetch(me(t.appConfig),o);r=yield e.json()}catch(s){throw he.create("token-subscribe-failed",{errorInfo:null==s?void 0:s.toString()})}if(r.error){const e=r.error.message;throw he.create("token-subscribe-failed",{errorInfo:e})}if(!r.token)throw he.create("token-subscribe-no-token");return r.token})}(t,n),o={token:i,createTime:Date.now(),subscriptionOptions:n};return yield pe(t,o),o.token})}function Ie(e){const t={from:e.from,collapseKey:e.collapse_key,messageId:e.fcmMessageId};return function(e,t){if(!t.notification)return;e.notification={};const n=t.notification.title;n&&(e.notification.title=n);const i=t.notification.body;i&&(e.notification.body=i);const o=t.notification.image;o&&(e.notification.image=o);const r=t.notification.icon;r&&(e.notification.icon=r)}(t,e),function(e,t){if(!t.data)return;e.data=t.data}(t,e),function(e,t){var n,i,o,r,s;if(!t.fcmOptions&&!(null===(n=t.notification)||void 0===n?void 0:n.click_action))return;e.fcmOptions={};const a=null!==(o=null===(i=t.fcmOptions)||void 0===i?void 0:i.link)&&void 0!==o?o:null===(r=t.notification)||void 0===r?void 0:r.click_action;a&&(e.fcmOptions.link=a);const c=null===(s=t.fcmOptions)||void 0===s?void 0:s.analytics_label;c&&(e.fcmOptions.analyticsLabel=c)}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(t,e),t}function Te(e){return he.create("missing-app-config-values",{valueName:e})}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
!function(e,t){const n=[];for(let i=0;i<e.length;i++)n.push(e.charAt(i)),i<t.length&&n.push(t.charAt(i));n.join("")}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */("AzSCbw63g1R0nCw85jG8","Iaya3yLKwmgvh7cF0q4");class Ce{constructor(e,t,n){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const i=function(e){if(!e||!e.options)throw Te("App Configuration Object");if(!e.name)throw Te("App Name");const t=["projectId","apiKey","appId","messagingSenderId"],{options:n}=e;for(const i of t)if(!n[i])throw Te(i);return{appName:e.name,projectId:n.projectId,apiKey:n.apiKey,appId:n.appId,senderId:n.messagingSenderId}}(e);this.firebaseDependencies={app:e,appConfig:i,installations:t,analyticsProvider:n}}_delete(){return Promise.resolve()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function je(t){return e(this,null,function*(){try{t.swRegistration=yield navigator.serviceWorker.register("/firebase-messaging-sw.js",{scope:"/firebase-cloud-messaging-push-scope"}),t.swRegistration.update().catch(()=>{})}catch(e){throw he.create("failed-service-worker-registration",{browserErrorMessage:null==e?void 0:e.message})}})}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function Pe(t,n){return e(this,null,function*(){if(!navigator)throw he.create("only-available-in-window");if("default"===Notification.permission&&(yield Notification.requestPermission()),"granted"!==Notification.permission)throw he.create("permission-blocked");
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
return yield function(t,n){return e(this,null,function*(){n?t.vapidKey=n:t.vapidKey||(t.vapidKey=ee)})}(t,null==n?void 0:n.vapidKey),yield function(t,n){return e(this,null,function*(){if(n||t.swRegistration||(yield je(t)),n||!t.swRegistration){if(!(n instanceof ServiceWorkerRegistration))throw he.create("invalid-sw-registration");t.swRegistration=n}})}(t,null==n?void 0:n.serviceWorkerRegistration),ve(t)})}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oe(t,n,i){return e(this,null,function*(){const e=function(e){switch(e){case oe.NOTIFICATION_CLICKED:return"notification_open";case oe.PUSH_RECEIVED:return"notification_foreground";default:throw new Error}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(n);(yield t.firebaseDependencies.analyticsProvider.get()).logEvent(e,{message_id:i[te],message_name:i["google.c.a.c_l"],message_time:i["google.c.a.ts"],message_device_time:Math.floor(Date.now()/1e3)})})}function De(t,n){return e(this,null,function*(){const e=n.data;if(!e.isFirebaseMessaging)return;t.onMessageHandler&&e.messageType===oe.PUSH_RECEIVED&&("function"==typeof t.onMessageHandler?t.onMessageHandler(Ie(e)):t.onMessageHandler.next(Ie(e)));const i=e.data;var o;"object"==typeof(o=i)&&o&&te in o&&"1"===i["google.c.a.e"]&&(yield Oe(t,e.messageType,i))})}const Ae="@firebase/messaging",Ke="0.12.12",Me=e=>{const t=e.getProvider("messaging").getImmediate();return{getToken:e=>Pe(t,e)}};
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function _e(){return e(this,null,function*(){try{yield c()}catch(e){return!1}return"undefined"!=typeof window&&u()&&l()&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&"fetch"in window&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")})}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function Ee(e=f()){return _e().then(e=>{if(!e)throw he.create("unsupported-browser")},e=>{throw he.create("indexed-db-unsupported")}),o(d(e),"messaging").getImmediate()}function Ne(t,n){return e(this,null,function*(){return Pe(t=d(t),n)})}function xe(t){return function(t){return e(this,null,function*(){if(!navigator)throw he.create("only-available-in-window");return t.swRegistration||(yield je(t)),ke(t)})}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(t=d(t))}function $e(e,t){return function(e,t){if(!navigator)throw he.create("only-available-in-window");return e.onMessageHandler=t,()=>{e.onMessageHandler=null}}(e=d(e),t)}n(new i("messaging",e=>{const t=new Ce(e.getProvider("app").getImmediate(),e.getProvider("installations-internal").getImmediate(),e.getProvider("analytics-internal"));return navigator.serviceWorker.addEventListener("message",e=>De(t,e)),t},"PUBLIC")),n(new i("messaging-internal",Me,"PRIVATE")),t(Ae,Ke),t(Ae,Ke,"esm2017");export{xe as deleteToken,Ee as getMessaging,Ne as getToken,_e as isSupported,$e as onMessage};
