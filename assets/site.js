/* 昆山益康家政 — 全站共享脚本（原生 JS，无依赖、无第三方统计）
   1) 移动端导航  2) 微信咨询弹层与复制  3) 咨询/应聘表单提交
   页面元素上的 data-event 属性仅为预留的埋点名称，本脚本不会上报任何数据。 */
(function () {
  'use strict';
  var WECHAT_ID = 'yikangcare';
  var TEL = '15850301819';
  var TEL_TEXT = '158 5030 1819';
  var LEADS_API = '/api/leads';
  var doc = document;

  /* ───────── 1. 导航 ───────── */
  var toggle = doc.querySelector('.nav-toggle');
  var nav = doc.getElementById('site-nav');
  function setNav(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setNav(false);
        toggle.focus();
      }
    });
    doc.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-header')) setNav(false);
    });
    // 当前页高亮
    var here = location.pathname.replace(/index\.html$/, '');
    nav.querySelectorAll('a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href.indexOf('#') === -1 && href !== '/' && here.indexOf(href.replace(/index\.html$/, '')) === 0) {
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ───────── 2. 微信咨询 ───────── */
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = doc.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      // 弹层打开时必须插入弹层内部，否则无法获得焦点
      var host = doc.querySelector('dialog[open]') || doc.body;
      host.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (err) { ok = false; }
      host.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      // 剪贴板 API 被拒绝（权限、页面未聚焦等）时回退到旧方式
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  var isMobile = /Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(navigator.userAgent);
  var inWeChat = /MicroMessenger/i.test(navigator.userAgent);
  var dialog = null;

  function buildDialog() {
    dialog = doc.createElement('dialog');
    dialog.className = 'wx-dialog';
    dialog.setAttribute('aria-labelledby', 'wx-title');
    dialog.innerHTML =
      '<div class="wx-box">' +
      '<div class="wx-head">' +
      '<picture><source type="image/webp" srcset="/image/wechat-cheng-manager-avatar-192.webp"><img class="wx-avatar" src="/image/wechat-cheng-manager-avatar-192.jpg" alt="程经理的微信头像" width="56" height="56"></picture>' +
      '<div><h2 id="wx-title">程经理微信（公司法人）</h2>' +
      '<p>扫码或搜索微信号 ' + WECHAT_ID + ' 添加咨询</p></div>' +
      '</div>' +
      '<img class="wx-qr" src="/image/wechat-cheng-manager-qr.png" alt="程经理微信二维码，微信号 ' + WECHAT_ID + '" width="720" height="720">' +
      (isMobile ? '<p class="wx-tip">' + (inWeChat ? '长按二维码可直接识别添加' : '在本机浏览器中无法扫码，请复制微信号到微信搜索') + '</p>' : '') +
      '<button type="button" class="btn btn-p btn-xl btn-block i-copy" data-wx-copy data-event="wechat_copy">复制微信号 ' + WECHAT_ID + '</button>' +
      (isMobile && !inWeChat ? '<button type="button" class="btn btn-g btn-xl btn-block i-wx" data-wx-open data-event="wechat_open">复制并打开微信</button>' : '') +
      '<p class="wx-msg" role="status" aria-live="polite"></p>' +
      '<p class="wx-note">当前为个人微信；企业微信及微信小程序正在筹备中。</p>' +
      '<p>着急安排？<a class="text-link" href="tel:' + TEL + '" data-event="call_wechat_dialog">直接拨打 ' + TEL_TEXT + '</a></p>' +
      '<button type="button" class="wx-close" data-wx-close>关闭</button>' +
      '</div>';
    doc.body.appendChild(dialog);
    var msg = dialog.querySelector('.wx-msg');
    function say(text, isErr) {
      msg.textContent = text;
      msg.classList.toggle('is-err', !!isErr);
    }
    function doCopy() {
      return copyText(WECHAT_ID).then(function () {
        say('已复制微信号 ' + WECHAT_ID + '，请到微信中粘贴搜索');
        return true;
      }, function () {
        say('复制未成功，请长按上方微信号手动复制', true);
        return false;
      });
    }
    dialog.querySelector('[data-wx-copy]').addEventListener('click', doCopy);
    var openBtn = dialog.querySelector('[data-wx-open]');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        doCopy().then(function (ok) {
          if (ok) say('已复制微信号，正在尝试打开微信…如未跳转，请手动打开微信粘贴搜索');
          // 仅尝试唤起微信 App；失败时页面保持不变，用户仍可手动打开
          setTimeout(function () { location.href = 'weixin://'; }, 350);
        });
      });
    }
    dialog.querySelector('[data-wx-close]').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', function () { say(''); });
  }

  doc.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-wechat]');
    if (trigger) {
      if (typeof HTMLDialogElement === 'undefined') return; // 旧浏览器：走链接回退到联系方式区域
      e.preventDefault();
      if (!dialog) buildDialog();
      if (!dialog.open) dialog.showModal();
      return;
    }
    var copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      e.preventDefault();
      var value = copyBtn.getAttribute('data-copy');
      var out = copyBtn.parentNode.querySelector('.copy-feedback') ||
        doc.getElementById(copyBtn.getAttribute('aria-describedby') || '');
      copyText(value).then(function () {
        if (out) out.textContent = '已复制 ' + value + '，请到微信中粘贴搜索';
      }, function () {
        if (out) out.textContent = '复制未成功，请手动输入微信号 ' + value;
      });
    }
  });

  /* ───────── 3. 表单 ───────── */
  var PHONE_RE = /^1[3-9]\d{9}$/;
  function normalizePhone(v) {
    return String(v || '').replace(/[\s\-()（）]/g, '').replace(/^(\+?86|0086)/, '');
  }
  function fallbackHtml() {
    return ' 请拨打 <a href="tel:' + TEL + '" data-event="call_form_fallback">' + TEL_TEXT + '</a>，或 ' +
      '<button type="button" data-wechat data-event="wechat_form_fallback">复制微信号 ' + WECHAT_ID + '</button> 联系我们。';
  }

  doc.querySelectorAll('form[data-lead-form]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    var btn = form.querySelector('button[type="submit"]');
    var btnLabel = btn.textContent;
    var loadedAt = Date.now();
    var enabled = null; // null=未知 true/false=已探测

    function setStatus(kind, html) {
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
      status.innerHTML = html || '';
    }
    function setBusy(busy) {
      btn.disabled = busy;
      btn.setAttribute('aria-busy', busy ? 'true' : 'false');
      btn.innerHTML = busy ? '<span class="spinner" aria-hidden="true"></span>正在提交…' : btnLabel;
    }
    function markDisabled() {
      enabled = false;
      btn.disabled = true;
      setStatus('info', '在线提交暂未启用，请拨打电话或复制微信号。' + fallbackHtml());
    }
    function fieldError(input, text) {
      var err = form.querySelector('[data-err-for="' + input.name + '"]');
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
      if (err) err.textContent = text || '';
    }
    function validate() {
      var first = null;
      function fail(input, text) { fieldError(input, text); if (!first) first = input; }
      var name = form.elements.name;
      var phone = form.elements.phone;
      var consent = form.elements.consent;
      fieldError(name, ''); fieldError(phone, ''); fieldError(consent, '');
      var nameVal = name.value.trim();
      if (nameVal.length < 1 || nameVal.length > 20) fail(name, '请填写称呼（20 字以内）');
      if (!PHONE_RE.test(normalizePhone(phone.value))) fail(phone, '请填写 11 位中国大陆手机号');
      var age = form.elements.age;
      if (age) {
        fieldError(age, '');
        if (age.value !== '' && !(/^\d{1,2}$/.test(age.value) && +age.value >= 18 && +age.value <= 60)) fail(age, '年龄请填写 18–60 之间的数字，或留空');
      }
      if (!consent.checked) fail(consent, '请先阅读并勾选同意隐私说明');
      if (first) first.focus();
      return !first;
    }

    // 探测后端是否已配置；未配置（或纯静态托管无此接口）时如实告知，不允许提交
    fetch(LEADS_API, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
      .then(function (d) { if (d && d.enabled === true) { enabled = true; } else { markDisabled(); } })
      .catch(markDisabled);

    form.addEventListener('focusin', function () { doc.body.classList.add('form-active'); });
    form.addEventListener('focusout', function () { doc.body.classList.remove('form-active'); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (enabled === false) { markDisabled(); return; }
      setStatus('', '');
      if (!validate()) return;

      var data = { form_type: form.getAttribute('data-lead-form'), page: location.pathname, elapsed_ms: Date.now() - loadedAt };
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'submit') return;
        data[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
      });
      data.phone = normalizePhone(data.phone);

      setBusy(true);
      fetch(LEADS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) { return { status: r.status, body: body }; });
      }).then(function (res) {
        setBusy(false);
        if (res.status === 200 && res.body && res.body.ok === true) {
          form.reset();
          btn.disabled = true;
          btn.textContent = '已提交';
          setStatus('ok', form.getAttribute('data-success') || '提交成功，我们会尽快与您联系。');
          return;
        }
        var code = res.body && res.body.error;
        if (code === 'not_configured') { markDisabled(); return; }
        if (code === 'validation' && res.body.fields) {
          Object.keys(res.body.fields).forEach(function (k) {
            if (form.elements[k]) fieldError(form.elements[k], res.body.fields[k]);
          });
          setStatus('err', '提交未成功：请检查标红的内容后重试。');
          return;
        }
        // 429 可能来自 Cloudflare WAF 限流（响应体不是本接口的 JSON）
        if (res.status === 429 || code === 'rate_limited' || code === 'too_fast') {
          setStatus('err', '提交过于频繁，请稍后再试。' + fallbackHtml());
          return;
        }
        setStatus('err', '提交未成功，您的信息没有送达。' + fallbackHtml());
      }).catch(function () {
        setBusy(false);
        setStatus('err', '网络异常，提交未成功，您的信息没有送达。' + fallbackHtml());
      });
    });
  });
})();
