(function () {
  'use strict';
  var VAPID_PUBLIC_KEY = 'BLIFfgaENSgGyNefkYF0A9E58wewAy0HNEKO46A9cm3WOcAs8ygS769aLYjDdxYTlKCyrEfhhiwh3NQQiSLOpac';
  var btn = document.getElementById('pushBtn');
  if (!btn) return;
  var sb = window.supabase.createClient(window.ALSHIFA_SUPABASE_URL, window.ALSHIFA_SUPABASE_ANON_KEY);

  function toast(msg, isErr) {
    var t = document.getElementById('toast');
    if (!t) { alert(msg); return; }
    t.textContent = msg; t.className = 'toast' + (isErr ? ' err' : ''); t.style.display = 'block';
    setTimeout(function () { t.style.display = 'none'; }, 6000);
  }
  function b64ToU8(s) {
    var p = '='.repeat((4 - s.length % 4) % 4);
    var raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function ab2b64(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function standalone() { return window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function setOn() { btn.textContent = 'الإشعارات شغالة ✓'; btn.disabled = true; }

  function save(sub) {
    var j = sub.toJSON();
    return sb.from('push_subscriptions').upsert({
      endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
      label: (navigator.userAgent || '').slice(0, 120)
    }, { onConflict: 'endpoint' });
  }

  function enable() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      if (isIOS() && !standalone()) {
        toast('على الآيفون: اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية»، وافتح الموقع من الأيقونة وبعدين اضغط تفعيل الإشعارات.', true);
      } else { toast('المتصفح ده مش بيدعم الإشعارات. جرب Chrome.', true); }
      return;
    }
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { toast('لازم تسمح بالإشعارات من إعدادات المتصفح.', true); return; }
      return navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; })
        .then(function (reg) {
          return reg.pushManager.getSubscription().then(function (s) {
            return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID_PUBLIC_KEY) });
          });
        })
        .then(function (sub) { return save(sub); })
        .then(function (res) {
          if (res && res.error) { toast('تعذر الحفظ: ' + res.error.message, true); return; }
          setOn(); toast('تم تفعيل الإشعارات على الجهاز ده ✓');
        });
    }).catch(function (e) { toast('تعذر التفعيل: ' + (e && e.message ? e.message : e), true); });
  }
  btn.addEventListener('click', enable);

  /* لو الإذن متاح بالفعل، جدد تسجيل الجهاز بصمت */
  if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; })
      .then(function (reg) { return reg.pushManager.getSubscription(); })
      .then(function (sub) { if (sub) { return save(sub).then(function (r) { if (!r.error) setOn(); }); } })
      .catch(function () {});
  }
})();
