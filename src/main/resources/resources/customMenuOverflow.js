(function () {
    'use strict';

    var isRebuilding = false;

    function isHorizontalMenu() {
        return document.body.classList.contains('horizontal_menu');
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
            existing.remove();
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

    function getAvailableWidth(menu) {
        var host = menu.parentElement;
        if (!host) {
            return menu.clientWidth - 80;
        }
        return host.clientWidth - 80;
    }

    function rebuildMenu() {
        if (!isHorizontalMenu() || isRebuilding) {
            return;
        }

        var menu = document.getElementById('category-container');
        if (!menu) {
            return;
        }

        isRebuilding = true;

        try {
            restoreJogetMoreItems(menu);

            var oldMore = document.getElementById('custom-menu-more');
            if (oldMore) {
                var overflowMenu = document.getElementById('custom-overflow-menu');
                if (overflowMenu) {
                    overflowMenu.dataset.bound = '';
                    while (overflowMenu.firstElementChild) {
                        var item = overflowMenu.firstElementChild;
                        item.classList.remove('open-submenu');
                        menu.insertBefore(item, oldMore);
                    }
                }
                oldMore.remove();
            }

            var items = Array.from(
                menu.querySelectorAll(':scope > li.category:not(#custom-menu-more):not(#menu-more)')
            );

            if (items.length === 0) {
                return;
            }

            var moreLi = createMoreMenu(menu);
            var overflowMenu = document.getElementById('custom-overflow-menu');
            var availableWidth = getAvailableWidth(menu);
            var usedWidth = 0;

            items.forEach(function (item) {
                usedWidth += item.offsetWidth;
                if (usedWidth > availableWidth) {
                    item.classList.remove('open-submenu');
                    overflowMenu.appendChild(item);
                }
            });

            if (overflowMenu.children.length === 0) {
                moreLi.remove();
            }
        } finally {
            isRebuilding = false;
        }
    }

    function scheduleRebuild() {
        window.clearTimeout(window.__colorAdminMenuTimer);
        window.__colorAdminMenuTimer = window.setTimeout(rebuildMenu, 400);
    }

    function init() {
        if (!isHorizontalMenu()) {
            return;
        }

        document.addEventListener('click', function (e) {
            var moreLi = document.getElementById('custom-menu-more');
            if (moreLi && !moreLi.contains(e.target)) {
                moreLi.classList.remove('open');
            }
        });

        window.setTimeout(rebuildMenu, 600);
        window.setTimeout(rebuildMenu, 1500);

        window.addEventListener('resize', scheduleRebuild);

        if (window.jQuery) {
            window.jQuery(document).on('page_loaded', function () {
                window.setTimeout(rebuildMenu, 600);
                window.setTimeout(rebuildMenu, 1500);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
