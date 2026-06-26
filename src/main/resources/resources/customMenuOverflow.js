(function () {
    'use strict';

    var STORAGE_KEY = 'colorAdminMenuOverflow';
    var isRebuilding = false;
    var hideGeneration = 0;
    var showFallbackTimer = null;

    function isHorizontalMenu() {
        return document.body.classList.contains('horizontal_menu');
    }

    function setMenuLoading() {
        document.body.classList.remove('custom-menu-ready');
        document.body.classList.add('custom-menu-loading');
    }

    function setMenuReady() {
        document.body.classList.remove('custom-menu-loading');
        document.body.classList.add('custom-menu-ready');
        if (showFallbackTimer) {
            window.clearTimeout(showFallbackTimer);
            showFallbackTimer = null;
        }
    }

    function scheduleShowFallback() {
        if (showFallbackTimer) {
            window.clearTimeout(showFallbackTimer);
        }
        showFallbackTimer = window.setTimeout(setMenuReady, 3000);
    }

    function getCachedOverflowIds() {
        try {
            var raw = window.sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveOverflowIds(ids) {
        try {
            if (ids.length) {
                window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
            } else {
                window.sessionStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            /* ignore */
        }
    }

    function restoreJogetMoreItems(menu) {
        var jogetMore = document.getElementById('moreSubMenu');
        var jogetMoreLi = document.getElementById('menu-more');
        if (!jogetMore || !jogetMoreLi) {
            return;
        }
        while (jogetMore.firstElementChild) {
            menu.insertBefore(jogetMore.firstElementChild, jogetMoreLi);
        }
        jogetMoreLi.style.display = 'none';
    }

    function bindOverflowPanel() {
        var overflowMenu = document.getElementById('custom-overflow-menu');
        if (!overflowMenu || overflowMenu.dataset.bound === '1') {
            return;
        }
        overflowMenu.dataset.bound = '1';

        overflowMenu.addEventListener('click', function (e) {
            var categoryLink = e.target.closest('li.category > a.dropdown');
            if (!categoryLink || !overflowMenu.contains(categoryLink)) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();

            var li = categoryLink.parentElement;
            overflowMenu.querySelectorAll('li.category.open-submenu').forEach(function (other) {
                if (other !== li) {
                    other.classList.remove('open-submenu');
                }
            });
            li.classList.toggle('open-submenu');
        });
    }

    function createMoreMenu(menu) {
        var existing = document.getElementById('custom-menu-more');
        if (existing) {
            return existing;
        }

        var moreLi = document.createElement('li');
        moreLi.id = 'custom-menu-more';
        moreLi.className = 'category';
        moreLi.innerHTML =
            '<a href="javascript:void(0)">&#9776;</a>' +
            '<ul id="custom-overflow-menu"></ul>';
        menu.appendChild(moreLi);

        moreLi.querySelector('a').addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            moreLi.classList.toggle('open');
        });

        bindOverflowPanel();
        return moreLi;
    }

    function removeMoreMenu(menu) {
        var moreLi = document.getElementById('custom-menu-more');
        if (!moreLi) {
            return;
        }
        var overflowMenu = document.getElementById('custom-overflow-menu');
        if (overflowMenu) {
            overflowMenu.dataset.bound = '';
            while (overflowMenu.firstElementChild) {
                menu.insertBefore(overflowMenu.firstElementChild, moreLi);
            }
        }
        moreLi.remove();
    }

    function collectCategoryItems(menu) {
        var items = [];
        menu.querySelectorAll(':scope > li.category:not(#custom-menu-more):not(#menu-more)').forEach(function (li) {
            items.push(li);
        });
        var overflowMenu = document.getElementById('custom-overflow-menu');
        if (overflowMenu) {
            overflowMenu.querySelectorAll(':scope > li.category').forEach(function (li) {
                items.push(li);
            });
        }
        return items;
    }

    function getMeasureHost(menu) {
        var host = document.getElementById('custom-menu-measure');
        if (host) {
            return host;
        }
        host = document.createElement('ul');
        host.id = 'custom-menu-measure';
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText =
            'position:absolute!important;left:-9999px!important;top:0!important;' +
            'visibility:hidden!important;pointer-events:none!important;' +
            'white-space:nowrap!important;display:flex!important;flex-wrap:nowrap!important;';
        (menu.parentElement || document.body).appendChild(host);
        return host;
    }

    function measureItemWidths(items, menu) {
        var host = getMeasureHost(menu);
        host.className = menu.className;
        host.innerHTML = '';

        return items.map(function (item) {
            var clone = item.cloneNode(true);
            host.appendChild(clone);
            var width = clone.offsetWidth;
            host.removeChild(clone);
            return width;
        });
    }

    function getContainerWidth(menu) {
        var host = menu.parentElement;
        var width = host ? host.clientWidth : menu.clientWidth;
        return width || 0;
    }

    function getAvailableWidth(menu, moreLi) {
        var width = getContainerWidth(menu);
        var reserved = moreLi ? (moreLi.offsetWidth || 48) + 10 : 80;
        return width - reserved;
    }

    function applyCachedLayout(menu) {
        var ids = getCachedOverflowIds();
        if (!ids.length) {
            return false;
        }

        var moreLi = document.getElementById('custom-menu-more') || createMoreMenu(menu);
        var overflowMenu = document.getElementById('custom-overflow-menu');
        if (!overflowMenu) {
            return false;
        }

        ids.forEach(function (id) {
            var item = document.getElementById(id);
            if (item && item.parentElement !== overflowMenu) {
                item.classList.remove('open-submenu');
                overflowMenu.appendChild(item);
            }
        });

        return overflowMenu.children.length > 0;
    }

    function rebuildMenu() {
        if (!isHorizontalMenu() || isRebuilding) {
            return false;
        }

        var menu = document.getElementById('category-container');
        if (!menu) {
            return false;
        }

        isRebuilding = true;

        try {
            restoreJogetMoreItems(menu);

            var items = collectCategoryItems(menu);
            if (!items.length) {
                removeMoreMenu(menu);
                saveOverflowIds([]);
                return true;
            }

            var moreLi = createMoreMenu(menu);
            var overflowMenu = document.getElementById('custom-overflow-menu');
            var widths = measureItemWidths(items, menu);
            var availableWidth = getAvailableWidth(menu, moreLi);
            var usedWidth = 0;
            var overflowIds = [];

            items.forEach(function (item, index) {
                usedWidth += widths[index];
                if (usedWidth > availableWidth) {
                    item.classList.remove('open-submenu');
                    overflowMenu.appendChild(item);
                    if (item.id) {
                        overflowIds.push(item.id);
                    }
                } else {
                    menu.insertBefore(item, moreLi);
                }
            });

            if (!overflowMenu.children.length) {
                removeMoreMenu(menu);
                saveOverflowIds([]);
            } else {
                saveOverflowIds(overflowIds);
            }

            return true;
        } finally {
            isRebuilding = false;
        }
    }

    function scheduleFormatNavRefine() {
        window.clearTimeout(window.__colorAdminFormatNavTimer);
        window.__colorAdminFormatNavTimer = window.setTimeout(rebuildMenu, 700);
        window.clearTimeout(window.__colorAdminFormatNavTimer2);
        window.__colorAdminFormatNavTimer2 = window.setTimeout(rebuildMenu, 1100);
    }

    function applyLayoutFast() {
        var menu = document.getElementById('category-container');
        if (!menu) {
            return;
        }
        applyCachedLayout(menu);
        rebuildMenu();
        setMenuReady();
        scheduleFormatNavRefine();
    }

    function onMenusUpdated() {
        if (!isHorizontalMenu()) {
            return;
        }
        applyLayoutFast();
    }

    function installAjaxHooks() {
        var attempts = 0;

        function tryHook() {
            var theme = window.AjaxUniversalTheme;
            if (theme && !theme.__colorAdminMenuHooked) {
                var originalUpdateMenus = theme.updateMenus;
                theme.updateMenus = function (menus) {
                    originalUpdateMenus.call(theme, menus);
                    onMenusUpdated();
                };
                theme.__colorAdminMenuHooked = true;
                return;
            }
            if (++attempts < 80) {
                window.setTimeout(tryHook, 50);
            }
        }

        tryHook();
    }

    function scheduleBackgroundRefine(gen) {
        [120, 300].forEach(function (delay) {
            window.setTimeout(function () {
                if (gen !== hideGeneration) {
                    return;
                }
                rebuildMenu();
            }, delay);
        });
    }

    function showWhenReady(gen, menu, attempt) {
        if (gen !== hideGeneration) {
            return;
        }

        applyCachedLayout(menu);
        rebuildMenu();

        var width = getContainerWidth(menu);
        var hasItems = menu.querySelectorAll(':scope > li.category:not(#menu-more)').length > 0;

        if ((width > 0 && hasItems) || attempt >= 4) {
            requestAnimationFrame(function () {
                if (gen !== hideGeneration) {
                    return;
                }
                rebuildMenu();
                setMenuReady();
                scheduleBackgroundRefine(gen);
            });
            return;
        }

        window.setTimeout(function () {
            showWhenReady(gen, menu, attempt + 1);
        }, attempt === 0 ? 0 : 25);
    }

    function rebuildOnInitialLoad() {
        if (!isHorizontalMenu()) {
            return;
        }

        var gen = ++hideGeneration;
        setMenuLoading();
        scheduleShowFallback();

        var menu = document.getElementById('category-container');
        if (!menu) {
            setMenuReady();
            return;
        }

        showWhenReady(gen, menu, 0);
    }

    function scheduleRebuild() {
        if (!document.body.classList.contains('custom-menu-ready')) {
            return;
        }
        window.clearTimeout(window.__colorAdminMenuTimer);
        window.__colorAdminMenuTimer = window.setTimeout(rebuildMenu, 150);
    }

    function onMenuLinkClick() {
        var moreLi = document.getElementById('custom-menu-more');
        if (moreLi) {
            moreLi.classList.remove('open');
        }
    }

    function init() {
        if (!isHorizontalMenu()) {
            return;
        }

        installAjaxHooks();
        setMenuLoading();

        document.addEventListener('click', function (e) {
            var moreLi = document.getElementById('custom-menu-more');
            if (moreLi && !moreLi.contains(e.target)) {
                moreLi.classList.remove('open');
            }
        });

        rebuildOnInitialLoad();

        window.addEventListener('resize', scheduleRebuild);

        if (window.jQuery) {
            window.jQuery(document)
                .on('click', '#category-container a[href]', function (e) {
                    var link = e.currentTarget;
                    var href = link.getAttribute('href');
                    if (!href || href === 'javascript:void(0)') {
                        return;
                    }
                    if (link.closest('#custom-menu-more > a')) {
                        return;
                    }
                    if (link.classList.contains('dropdown') && link.closest('#custom-overflow-menu')) {
                        return;
                    }
                    onMenuLinkClick();
                })
                .on('page_loaded', function () {
                    if (isHorizontalMenu()) {
                        applyLayoutFast();
                    }
                });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
