// ==UserScript==
// @name         Расписание ИТИ - Горизонтальная таблица (V1.16 - Оптимизация)
// @namespace    http://tampermonkey.net/
// @version      1.16
// @description  Принудительно отображает горизонтальную таблицу. Закреплен столбец времени. Текст центрирован. Перестановка кнопок через CSS.
// @author       MubaraksaGen
// @match        https://t2iti.khsu.ru/week*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=khsu.ru
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Функция для "умного" переноса текста в ячейках
    function applySmartWordWrapToTextNode(textNode) {
        if (!textNode || textNode.nodeType !== 3) return;

        const fullText = textNode.textContent || "";
        if (!fullText.trim()) return;

        const words = fullText.split(/\s+/);
        let lines = [];
        let currentLineWords = [];

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const nextWord = words[i + 1];
            currentLineWords.push(word);
            if (!nextWord || nextWord.length >= 5) {
                lines.push(currentLineWords.join(" "));
                currentLineWords = [];
            }
        }

        if (currentLineWords.length > 0) {
            lines.push(currentLineWords.join(" "));
        }

        const fragment = document.createDocumentFragment();
        lines.forEach((line, index) => {
            fragment.appendChild(document.createTextNode(line));
            if (index < lines.length - 1) {
                fragment.appendChild(document.createElement('br'));
            }
        });

        textNode.parentNode.replaceChild(fragment, textNode);
    }

    // Функция для применения "умного" переноса ко всем целевым элементам
    function applySmartWordWrap() {
        const targetElements = document.querySelectorAll(
            '.pair_container #name p, .pair_container #auditory, .pair_container #teacher'
        );

        targetElements.forEach(el => {
            if (!el || !el.childNodes || el.childNodes.length === 0) return;

            const childNodes = Array.from(el.childNodes);
            childNodes.forEach(node => {
                if (node.nodeType === 3 && node.textContent.trim()) {
                    applySmartWordWrapToTextNode(node);
                }
            });
        });
    }

    // Функция для обработки групп в ячейке
    function processGroupLinks() {
        // Ищем все pair_container элементы
        const pairContainers = document.querySelectorAll('.pair_container');

        pairContainers.forEach(container => {
            // Находим все p теги внутри контейнера
            const pTags = container.querySelectorAll('p');

            pTags.forEach(pTag => {
                // Проверяем, содержит ли p тег ссылки на группы
                if (pTag.innerHTML.includes('group-link')) {
                    // Получаем все ссылки внутри этого p тега
                    const links = pTag.querySelectorAll('a.group-link');

                    if (links.length > 0) {
                        // Создаем новый контейнер для групп
                        const groupsContainer = document.createElement('div');
                        groupsContainer.className = 'groups-wrapper';

                        // Создаем строки по 2 группы
                        for (let i = 0; i < links.length; i += 2) {
                            const row = document.createElement('div');
                            row.className = 'group-row';

                            // Добавляем первую группу
                            if (links[i]) {
                                row.appendChild(links[i].cloneNode(true));
                            }

                            // Добавляем разделитель если есть вторая группа
                            if (i + 1 < links.length && links[i + 1]) {
                                const separator = document.createElement('span');
                                separator.textContent = ', ';
                                separator.className = 'group-separator';
                                row.appendChild(separator);

                                // Добавляем вторую группу
                                row.appendChild(links[i + 1].cloneNode(true));
                            }

                            groupsContainer.appendChild(row);
                        }

                        // Заменяем оригинальный p тег новым контейнером
                        pTag.parentNode.replaceChild(groupsContainer, pTag);
                    }
                }
            });
        });
    }

    // Функция для применения изменений стилей
    function applyHorizontalTableStyles() {
        const mTable = document.getElementById('mTable');
        const sTablesContainer = document.getElementById('sTables');
        if (!mTable || !sTablesContainer) {
            console.log("Таблицы еще не загружены, ждем...");
            return false;
        }

        console.log("Применяем изменения стилей для горизонтальной таблицы (v14)...");

        mTable.style.display = 'table';
        if (mTable.parentElement) mTable.parentElement.style.display = 'block';
        sTablesContainer.style.display = 'none';

        const mainContent = document.getElementById('mainContent');
        if (mainContent) mainContent.style.display = 'block';

        let tableScrollContainer = document.getElementById('table-scroll-container-id');
        if (!tableScrollContainer) {
            tableScrollContainer = document.createElement('div');
            tableScrollContainer.id = 'table-scroll-container-id';
            mTable.parentNode.insertBefore(tableScrollContainer, mTable);
            tableScrollContainer.appendChild(mTable);
        }

        let customStyle = document.getElementById('custom-schedule-style-id');
        if (!customStyle) {
            customStyle = document.createElement('style');
            customStyle.id = 'custom-schedule-style-id';
            customStyle.type = 'text/css';
            document.head.appendChild(customStyle);
        }

        customStyle.textContent = `
        body, html, #mTable {
    font-family: "Segoe UI Semibold", sans-serif !important;
}
            :root {
                --green: rgb(217, 255, 217);
                --yellow: rgb(255, 248, 206);
                --red: rgb(255, 237, 214);
                --exam: rgb(255, 200, 191);
                --white: rgba(255, 255, 255, 0);
                --blue: rgb(236, 244, 255);
                --other: white;
            }

            /* Убедимся, что таблица может расти по размеру содержимого */
            #mTable {
                table-layout: auto; /* Автоматический расчет ширины столбцов на основе содержимого */
                width: auto; /* Ширина определяется содержимым */
                min-width: 600px; /* Минимальная ширина для предотвращения сжатия на маленьких экранах */
                max-width: none; /* Максимальная ширина не ограничена */
                margin: 0 auto; /* Центрируем таблицу внутри контейнера скролла */
                height: auto; /* Высота определяется содержимым */
                border-collapse: separate !important; /* separate для корректной работы sticky и границ */
                border-spacing: 0; /* Убираем промежутки между ячейками */
                font-size: 13px; /* Базовый размер шрифта для всей таблицы */
                line-height: 1.2; /* Базовый межстрочный интервал */
                position: relative; /* Для позиционирования sticky */
            }

            /* Стили для ячеек таблицы - позволяют растягиваться по содержимому */
            .wTable th, .wTable td {
                vertical-align: middle !important; /* Центрирование по вертикали по умолчанию */
                padding: 4px !important; /* Внутренний отступ */
                margin: 0 !important;
                outline: none !important;
                /* Размеры определяются содержимым */
                width: auto !important;
                min-width: 100px !important; /* Минимальная ширина ячейки */
                max-width: none !important; /* Максимальная ширина не ограничена */
                height: auto !important; /* Высота определяется содержимым */
                min-height: 80px !important; /* Минимальная высота ячейки */
                max-height: none !important; /* Максимальная высота не ограничена */
                border: 1px solid #d8d8d8 !important; /* Границы ячеек */
                text-align: center !important; /* Центрирование текста по горизонтали */
                box-sizing: border-box !important; /* Включаем padding и border в размеры */
                /* Позволяем содержимому определять размеры */
                overflow: visible !important; /* Содержимое может выходить за границы (до скролла контейнера) */
                white-space: normal !important; /* Позволяем перенос строк */
                text-overflow: clip !important; /* Не обрезаем многоточием */
                font-size: inherit; /* Наследуем размер шрифта от таблицы */
            }

            /* Стили для первой колонки (время) - ЗАКРЕПЛЕНА */
            .wTable td:first-child, .wTable th:first-child {
                position: sticky !important; /* Закрепляем */
                left: -1px !important; /* Прилипает к левому краю контейнера */
                z-index: 2 !important; /* Поверх других ячеек */
                background-color: #ffffff !important; /* Фон, чтобы не было артефактов при скролле */
                box-shadow: inset -2px 0 0px #ffffff, -2px 0 0px #ffffff; /* Скрыть 1px артефакт слева */
                min-width: 45px !important; /* Минимальная ширина колонки времени */
                width: auto !important;
                max-width: none !important;
                font-size: 16px !important; /* Немного меньший шрифт для времени */
                padding: 2px 2px !important; /* Уменьшаем padding для времени */
                font-weight: bold !important; /* Сделаем время немного жирнее для выделения */
                height: auto !important;
                display: table-cell !important;
                vertical-align: middle !important; /* Центрирование по вертикали внутри ячейки */
                text-align: center !important; /* Центрирование по горизонтали внутри ячейки */
                font-family: "Segoe UI Semibold", sans-serif !important;
            }
            .tTime {
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important; /* Центрирование по вертикали внутри .tTime */
                align-items: center !important; /* Центрирование по горизонтали внутри .tTime */
                text-align: center !important;
                width: 100% !important;
                height: 100% !important;
                box-sizing: border-box !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            .tTime p { margin: 0 !important; padding: 0 !important; line-height: inherit !important; }
            .tTime > div { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; text-align: center !important; width: 100% !important; height: 100% !important; }

            /* Адаптируем контейнеры пар внутри ячеек */
            .pair_container {
                width: 100% !important; /* Занимает всю ширину ячейки */
                min-width: unset !important;
                max-width: unset !important;
                height: auto !important; /* Высота определяется содержимым */
                min-height: 75px !important; /* Минимальная высота внутри */
                max-height: none !important; /* Максимальная высота не ограничена */
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important; /* Центрирование по вертикали */
                align-items: center !important; /* Центрирование по горизонтали */
                text-align: center !important; /* Центрирование текста */
                padding: 3px !important;
                overflow: visible !important; /* Содержимое может выходить за границы */
                white-space: normal !important; /* Позволяем перенос строк внутри */
                text-overflow: clip !important; /* Не обрезаем многоточием */
                position: relative !important;
                font-size: inherit; /* Наследуем размер шрифта */
            }
            .pair_container.green { background-color: var(--green) !important; }
            .pair_container.yellow { background-color: var(--yellow) !important; }
            .pair_container.red { background-color: var(--red) !important; }
            .pair_container.white { background-color: var(--white) !important; }
            .pair_container.blue { background-color: var(--blue) !important; }
            .pair_container.exam { background-color: var(--exam) !important; }

            .pair_container #name, .pair_container #auditory, .pair_container #teacher {
                width: 100% !important;
                display: flex !important;
                flex-direction: column !important; /* Элементы внутри друг под другом */
                justify-content: center !important;
                align-items: center !important;
                text-align: center !important;
                flex-grow: 1 !important; /* Занимают доступное пространство */
                padding: 1px 0 !important;
                overflow: visible !important;
                white-space: normal !important;
                text-overflow: clip !important;
                box-sizing: border-box !important;
            }
            .pair_container #name p, .pair_container #auditory, .pair_container #teacher {
                margin: 0 !important;
                padding: 1px 2px !important; /* Небольшие отступы внутри */
                font-size: inherit !important; /* Наследуем размер шрифта (13px) */
                word-wrap: break-word !important; /* Перенос слов */
                overflow-wrap: break-word !important;
                line-height: inherit !important; /* Наследуем межстрочный интервал */
                white-space: normal !important; /* Позволяем перенос внутри элементов пары */
                overflow: visible !important;
                text-overflow: clip !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                word-break: normal !important;
            }
            /* Стили для ссылок - убедимся, что они наследуют цвет и стиль */
            .pair_container a {
                color: green !important;
                text-decoration: none !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                white-space: normal !important;
                overflow: visible !important;
                text-overflow: clip !important;
                max-width: 100% !important;
                display: inline-block !important; /* Помогает с переносом */
                font-size: inherit !important; /* Наследуем размер шрифта */
                text-align: center !important; /* Центрируем текст ссылки */
                line-height: inherit !important;
            }

            /* Стили для групп */
            .groups-wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
                padding: 2px 0;
            }

            .group-row {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                margin: 1px 0;
                flex-wrap: wrap;
                gap: 2px;
            }

            .group-separator {
                margin: 0 2px;
                color: #666;
            }

            /* Убедимся, что контейнер ints не ограничивает ширину */
            .ints { align-items: center; justify-content: center; display: flex; flex-direction: column; width: 100%; max-width: 100%; overflow-x: visible; padding: 0 5px; box-sizing: border-box; }
            .ints .container { width: 100%; max-width: 100%; overflow-x: visible; padding: 0 5px; box-sizing: border-box; }

            /* Контейнер скролла таблицы */
            #table-scroll-container-id { width: 100%; max-width: 100vw; overflow-x: auto; overflow-y: visible; margin: 10px 0 20px 0; scrollbar-width: thin; box-sizing: border-box; }
            #table-scroll-container-id::-webkit-scrollbar { height: 8px; }
            #table-scroll-container-id::-webkit-scrollbar-track { background: #f1f1f1; }
            #table-scroll-container-id::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
            #table-scroll-container-id::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }


            /* --- РАБОЧАЯ ЛОГИКА ПЕРЕСТАНОВКИ КНОПОК ЧЕРЕЗ CSS --- */
            .buttons-container {
                width: 100% !important;
                display: flex !important;
                flex-wrap: wrap !important; /* Включаем перенос элементов */
                justify-content: center !important;
                align-items: center !important;
                gap: 10px !important; /* Расстояние между кнопками в одной строке */
                margin: 15px 0 !important;
            }
            .buttons-container .centered-title {
                order: 1 !important; /* 1. Ставим первым */
                flex-basis: 100% !important; /* 2. Растягиваем на всю ширину для переноса */
                text-align: center !important;
                margin-bottom: 5px !important;
            }
            .buttons-container .leg {
                order: 3 !important; /* 4. Ставим последним */
                flex-basis: 100% !important; /* 5. Растягиваем на всю ширину для переноса */
                margin-top: 5px !important;
            }
            .buttons-container > *:not(.centered-title):not(.leg) {
                order: 2 !important; /* 3. Всё остальное ставим в середину */
            }
            /* --- КОНЕЦ ЛОГИКИ ПЕРЕСТАНОВКИ --- */

            /* Оригинальные стили для легенды */
            .leg ul {
                flex-wrap: wrap;
                justify-content: center;
                padding: 0 5px;
                margin: 10px 0;
                list-style: none;
                display: flex;
                gap: 5px;
            }
            .colortype {
                flex-shrink: 0;
                font-size: 13px;
                padding: 4px 6px;
                min-width: 120px;
                border: 1px solid #dfdfdf;
                border-radius: 8px;
                text-align: center;
                white-space: nowrap;
                background-color: inherit;
                box-sizing: border-box;
            }
            .colortype.greenType { background-color: var(--green) !important; }
            .colortype.yellowType { background-color: var(--yellow) !important; }
            .colortype.redType { background-color: var(--red) !important; }
            .colortype.examType { background-color: var(--exam) !important; }
            .colortype.otherType { background-color: var(--other) !important; border: 1px solid #ccc !important; }
        `;
        return true;
    }

    // --- Обработка загрузки и изменений ---

    function waitForElement(selector, callback, interval = 500, timeout = 15000) {
        const startTime = Date.now();
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
            } else if (Date.now() - startTime > timeout) {
                console.warn(`Элемент ${selector} не найден в течение ${timeout}ms.`);
            } else {
                setTimeout(checkElement, interval);
            }
        };
        checkElement();
    }

    // Функция для полного обновления таблицы
    function updateTable() {
        const stylesApplied = applyHorizontalTableStyles();
        if (stylesApplied) {
            setTimeout(() => {
                try {
                    applySmartWordWrap();
                    processGroupLinks();
                    console.log("Умный перенос текста и обработка групп применены (v16).");
                } catch (e) {
                    console.error("Ошибка при применении умного переноса или обработке групп:", e);
                }
            }, 150);
        }
    }

    // Добавляем дополнительную проверку для обработки групп
    function delayedGroupProcessing() {
        setTimeout(() => {
            processGroupLinks();
            console.log("Дополнительная обработка групп выполнена");
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            waitForElement('#mTable', updateTable);
            // Также запускаем дополнительную обработку через некоторое время
            setTimeout(delayedGroupProcessing, 2000);
        });
    } else {
        waitForElement('#mTable', updateTable);
        setTimeout(delayedGroupProcessing, 2000);
    }

    // MutationObserver для отслеживания изменений в DOM
    const observer = new MutationObserver(function(mutations) {
    // Only update if there are actual structural changes to the schedule table
    let shouldUpdate = false;

    for (const mutation of mutations) {
        // Check if the change involves elements we care about
        if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if added node is part of our schedule structure
                    if (node.id === 'mTable' ||
                        node.classList?.contains('pair_container') ||
                        node.querySelector?.('.pair_container')) {
                        shouldUpdate = true;
                        break;
                    }
                }
            }

            if (!shouldUpdate) {
                // Also check if any of the changed nodes are inside schedule containers
                for (const node of mutation.removedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE &&
                        (node.id === 'mTable' ||
                         node.classList?.contains('pair_container'))) {
                        shouldUpdate = true;
                        break;
                    }
                }
            }
        }

        // For attribute changes, only update if they affect our target elements
        if (mutation.type === 'attributes' &&
            (mutation.target.id === 'mTable' ||
             mutation.target.classList?.contains('pair_container') ||
             mutation.target.closest?.('.pair_container'))) {
            shouldUpdate = true;
        }
    }

    if (shouldUpdate) {
        waitForElement('#mTable', updateTable);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'id']
});

})();
