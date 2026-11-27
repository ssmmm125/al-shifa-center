self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  var d = { title: 'حسابات مركز الشفاء', body: 'تم تسجيل قيد جديد في الحسابات' };
  try { if (e.data) { d = e.data.json(); } } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: 'logo.png', badge: 'logo.png', tag: 'ledger-new', renotify: true, dir: 'rtl', lang: 'ar'
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if (list[i].url.indexOf('accounts.html') > -1 && 'focus' in list[i]) return list[i].focus(); }
    return self.clients.openWindow('accounts.html');
  }));
});
