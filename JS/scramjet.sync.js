!function() {
    var e = localStorage.getItem("phantom_session_id");
    e || (e = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36),
        localStorage.setItem("phantom_session_id", e),
        localStorage.setItem("phantom_session_created", Math.floor(Date.now() / 1e3).toString()));
    localStorage.getItem("phantom_session_created") || localStorage.setItem("phantom_session_created", Math.floor(Date.now() / 1e3).toString());
    
    var t, n = location.hostname, o = 30, r = o - Math.floor(Date.now() / 1e3) % o || o, a = "phantom_active_tabs", i = parseInt(localStorage.getItem(a) || "0");

    function s() {
        t && clearInterval(t);
        var e = function() {
            var e = document.getElementById("footer-refresh-countdown");
            e && (e.textContent = "(" + r + "s)");
            var t = document.getElementById("page-refresh-countdown");
            t && (t.textContent = "(Refreshing in " + r + "s)")
        };
        e();
        t = setInterval(function() {
            r--; e();
            if (r <= 0) {
                clearInterval(t);
                c();
            }
        }, 1e3)
    }

    function c() {
        var syncUrl = "https://counter.leelive2021.workers.dev/v2/c3luYw?sid=" + encodeURIComponent(e) + "&origin=" + encodeURIComponent(n);
        var searchParams = new URLSearchParams(window.location.search);
        var fullUrl = searchParams.get("priv_verified") ? syncUrl + "&priv_verified=" + searchParams.get("priv_verified") : syncUrl;

        return fetch(fullUrl).then(function(res) {
            return res.json()
        }).then(function(data) {
             if (data.maintenance && data.fallback) {
                var vs = JSON.parse(localStorage.getItem("void_settings") || "{}");
                vs.panicUrl = data.fallback;
                localStorage.setItem("void_settings", JSON.stringify(vs));
                
                void function() {
                    var panicUrl = vs.panicUrl || "https://classroom.google.com";
                    try { window.top.location.href = panicUrl } catch (err) { window.location.href = panicUrl }
                }();
                return;
            }

            var siteCfg = window.SITE_CONFIG || {};
            var localLock = siteCfg.domainLock && siteCfg.domainLock.enabled && siteCfg.domainLock.password;
            var serverLock = data.locked && data.private;
            var unlocked = "true" === sessionStorage.getItem("phantom_local_unlocked");

            if (serverLock || (localLock && !unlocked)) {
                !function(sid, url) {
                    window.Notify && (window.Notify.info = function() {}, window.Notify.success = function() {}, window.Notify.warning = function() {}, window.Notify.error = function() {});
                    document.documentElement.innerHTML = '<head><title>future</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#000!important;color:#fff;line-height:1.5;min-height:100vh;margin:0;display:flex;align-items:center;justify-content:center}*{box-sizing:border-box}.section{padding-bottom:20px;border-bottom:1px dashed #333;text-align:left}input[type="password"]{background:#1a1a1a;border:1px solid #333;color:#eee;padding:8px;border-radius:4px;outline:none;color-scheme:dark;font-family:inherit}button{padding:6px 12px;background:#111;color:#fff;border:1px solid #333;font-family:inherit;cursor:pointer}button:hover{background:#222}.error{color:#f00;display:none;margin-left:10px;font-size:14px}</style></head><body><div id="dl-container" class="section"><h3 style="margin-top:0;margin-bottom:20px;font-size:1.17em;font-weight:normal">this link requires a passcode to enter</h3><input type="password" id="dl-pass" placeholder="Enter Password"><button id="dl-submit">Login</button><span id="dl-error" class="error">Wrong password</span></div></body>';

                    var passInput = document.getElementById("dl-pass");
                    var submitBtn = document.getElementById("dl-submit");
                    var errorSpan = document.getElementById("dl-error");

                    var attemptLogin = function() {
                        errorSpan.style.display = "none";
                        submitBtn.innerText = "...";
                        var cv = data.c_v || 0;
                        var hash = btoa(passInput.value + "_" + cv).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
                        
                        fetch(url + "&priv_verified=" + hash).then(function(res) { return res.json(); }).then(function(resData) {
                            if (resData.locked) {
                                errorSpan.style.display = "inline-block";
                                submitBtn.innerText = "Login";
                            } else {
                                window.location.href = window.location.pathname + "?priv_verified=" + hash + "&priv_lk=1";
                            }
                        }).catch(function() {
                            errorSpan.innerText = "Network Error";
                            errorSpan.style.display = "inline-block";
                            submitBtn.innerText = "Login";
                        });
                    };

                    passInput.addEventListener("keyup", function(evt) { "Enter" === evt.key && attemptLogin(); });
                    submitBtn.addEventListener("click", attemptLogin);
                    window.stop && window.stop();
                }(e, syncUrl);
            } else {
                if (data.c_v) {
                    var cacheV = parseInt(localStorage.getItem("phantom_cache_v") || "0");
                    if (data.c_v > cacheV) {
                        localStorage.setItem("phantom_cache_v", data.c_v.toString());
                        return setTimeout(function() {
                            for (var keys = Object.keys(localStorage), k = 0; k < keys.length; k++) {
                                if ((0 === keys[k].indexOf("phantom_") && "phantom_cache_v" !== keys[k]) || "void_settings" === keys[k]) {
                                    localStorage.removeItem(keys[k]);
                                }
                            }
                            "caches" in window && caches.keys().then(function(cKeys) { cKeys.forEach(function(k) { caches.delete(k); }); });
                            navigator.serviceWorker && navigator.serviceWorker.getRegistrations().then(function(regs) { regs.forEach(function(r) { r.unregister(); }); });
                            var idb = window.indexedDB;
                            if (idb) {
                                try { idb.databases().then(function(dbs) { dbs.forEach(function(db) { idb.deleteDatabase(db.name); }); }); } catch (err) {}
                                ["scramjet-data", "uv-data", "scrambase"].forEach(function(db) { try { idb.deleteDatabase(db); } catch (err) {} });
                            }
                            window.location.reload();
                        }, 500);
                    }
                }

                var duid = data.duid || 0;
                var configV = parseInt(localStorage.getItem("phantom_config_v") || "0");
                if (0 === duid && 0 !== configV) {
                    localStorage.removeItem("phantom_config_v");
                    localStorage.removeItem("phantom_server_config");
                    location.reload();
                } else if (duid > configV && data.cfg) {
                    localStorage.setItem("phantom_config_v", duid.toString());
                    localStorage.setItem("phantom_server_config", JSON.stringify(data.cfg));
                    
                    var mergeObj = function(target, source) {
                        for (var key in source) {
                            if (source[key] && "object" == typeof source[key] && !Array.isArray(source[key])) {
                                target[key] = target[key] || {};
                                mergeObj(target[key], source[key]);
                            } else {
                                target[key] = source[key];
                            }
                        }
                    };
                    
                    window.SITE_CONFIG && mergeObj(window.SITE_CONFIG, data.cfg);
                    var fVer = document.getElementById("footer-version");
                    fVer && window.SITE_CONFIG && (fVer.textContent = "© 2026 " + (window.SITE_CONFIG.name || "Phantom Unblocked") + ". All rights reserved. | v" + (window.SITE_CONFIG.version || "1.0.0"));
                    window.postMessage({ type: "settings-update" }, "*");
                }

                var msgText = data.msg && "" !== data.msg.trim() ? data.msg : (window.SITE_CONFIG && window.SITE_CONFIG.announcement ? window.SITE_CONFIG.announcement.message : null);
                if (msgText && "" !== msgText.trim()) {
                    var seenKey = "msg_seen_" + (data.duid || 0);
                    var seenCount = parseInt(localStorage.getItem(seenKey) || "0");
                    var tabKey = "msg_tab_" + (data.duid || 0);
                    
                    if (seenCount < 2 && !sessionStorage.getItem(tabKey)) {
                        setTimeout(function() {
                            !function(title, content) {
                                var overlay = document.createElement("div");
                                overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;";
                                var modal = document.createElement("div");
                                modal.style.cssText = "background:#18181b;border:1px solid #27272a;border-radius:16px;padding:24px;max-width:400px;width:90vw;color:#e4e4e7;font-family:sans-serif;";
                                modal.innerHTML = '<h3 style="margin:0 0 12px;font-size:15px;color:#fff">' + title + '</h3><div style="font-size:13px;line-height:1.6;color:#a1a1aa">' + content + '</div><div style="text-align:right;margin-top:16px"><button style="background:#27272a;border:1px solid #3f3f46;color:#fff;padding:6px 16px;border-radius:8px;cursor:pointer;font-size:12px">OK</button></div>';
                                overlay.appendChild(modal);
                                document.body.appendChild(overlay);
                                var closeBtn = function() { overlay.remove(); };
                                modal.querySelector("button").onclick = closeBtn;
                                overlay.onclick = function(evt) { evt.target === overlay && closeBtn(); };
                            }("Announcements", msgText.replace(/\*\*\*(.*?)\*\*\*/g, "<del>$1</del>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"));
                            
                            localStorage.setItem(seenKey, (seenCount + 1).toString());
                            sessionStorage.setItem(tabKey, "true");
                        }, 1500);
                    }
                }

                !function() {
                    if (!document.getElementById("_sync-counter") && !document.getElementById("footer-online-count")) {
                        var el = document.createElement("div");
                        el.id = "_sync-counter";
                        el.style.cssText = "position:fixed;bottom:8px;right:12px;font-size:11px;color:rgba(255,255,255,0.4);font-family:monospace;z-index:9998;pointer-events:none;";
                        el.innerHTML = '<span id="footer-online-count">--</span> online <span id="footer-refresh-countdown" style="margin-left:4px;opacity:0.6"></span>';
                        document.body.appendChild(el);
                    }
                }();

                var footerCnt = document.getElementById("footer-online-count");
                footerCnt && (footerCnt.textContent = void 0 !== data.users ? data.users : "--");
                var pageCnt = document.getElementById("page-online-count");
                pageCnt && (pageCnt.textContent = void 0 !== data.users ? data.users : "--");

                r = void 0 !== data.next ? data.next : o - Math.floor(Date.now() / 1e3) % o || o;
                s();
            }
        }).catch(function() {
            var footerCnt = document.getElementById("footer-online-count");
            footerCnt && (footerCnt.textContent = "--");
            r = o - Math.floor(Date.now() / 1e3) % o || o;
            s();
        });
    }

    localStorage.setItem(a, (i + 1).toString());

    addEventListener("message", function(e) {
        var msg = e.data;
        if (msg && msg.sab) {
            var n = msg.sab, args = msg.args, body = msg.body, hdrs = msg.headers,
                dv = new DataView(n), u8 = new Uint8Array(n), xhr = new XMLHttpRequest;
            
            xhr.responseType = "arraybuffer";
            xhr.open(args[0], args[1], !0, args[3], args[4]);
            hdrs && Object.entries(hdrs).forEach(function(kv) { xhr.setRequestHeader(kv[0], kv[1]); });
            xhr.send(body);
            
            xhr.onload = function() {
                var pos = 1;
                dv.setUint16(pos, xhr.status); pos += 2;
                var hdrsStr = xhr.getAllResponseHeaders();
                dv.setUint32(pos, hdrsStr.length); pos += 4;
                
               n.byteLength < pos + hdrsStr.length && n.grow && n.grow(pos + hdrsStr.length);
                u8.set((new TextEncoder).encode(hdrsStr), pos); pos += hdrsStr.length;
                dv.setUint32(pos, xhr.response.byteLength); pos += 4;
                
                n.byteLength < pos + xhr.response.byteLength && n.grow && n.grow(pos + xhr.response.byteLength);
                u8.set(new Uint8Array(xhr.response), pos);
                dv.setUint8(0, 1);
            };
            xhr.ontimeout = xhr.onerror = xhr.onabort = function() { dv.setUint8(0, 1); };
        }
    });

    window.addEventListener("pagehide", function() {
        var actTabs = parseInt(localStorage.getItem(a) || "1") - 1;
        if (actTabs < 0) actTabs = 0;
        localStorage.setItem(a, actTabs.toString());
        if (0 === actTabs) {
           var termUrl = "https://counter.leelive2021.workers.dev/v2/terminate?action=leave&sid=" + encodeURIComponent(e) + "&origin=" + encodeURIComponent(n);
            navigator.sendBeacon ? navigator.sendBeacon(termUrl) : fetch(termUrl, { keepalive: !0 }).catch(function() {});
        }
    });

    localStorage.getItem("_fs") || localStorage.setItem("_fs", Math.floor(Date.now() / 1e3).toString());
    s();
    c();
}();
