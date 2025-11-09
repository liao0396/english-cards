// 這是 'script.js' 檔案 (v5 - 修正版)
// 它包含所有的功能邏輯

// 'words' 變數現在只是個空殼，等待 init() 填入
let words = []; 

let shuffleWords = []; 
let results = {}; 
let currentIndex = 0;

// 'baseWords' 變數將由 <script src="words.js"></script> 檔案提供。

// 頁面載入時初始化
window.onload = init;

// 簡化 init() 函式
function init() {
    // 檢查 baseWords 是否成功載入
    if (typeof baseWords === 'undefined' || baseWords.length === 0) {
        alert("錯誤：無法載入 'words.js' 題庫檔案！請檢查檔案名稱是否正確。");
        return;
    }

    if (localStorage.getItem('customWords')) {
        const storedWords = JSON.parse(localStorage.getItem('customWords'));
        if (storedWords.length > 0) {
            words = storedWords; 
        } else {
            words = [...baseWords]; // baseWords 來自 words.js
        }
    } else {
        words = [...baseWords]; // baseWords 來自 words.js
    }
    
    shuffleAndReset(); 
    updateStats();
    updateNavigation();
}

// 100 題抽題邏輯
function shuffleAndReset() {
    let shuffledFullList = [...words].sort(() => Math.random() - 0.5);
    
    if (shuffledFullList.length > 100) {
        shuffleWords = shuffledFullList.slice(0, 100);
    } else {
        shuffleWords = shuffledFullList;
    }

    results = {}; 
    currentIndex = 0;
    generateCurrentCard();
    updateNavigation();
    updateStats();
}

// *** 修正：建立步驟提示的函式 ***
function addStepMarker(element, stepNumber, markerClass) {
    // 檢查是否已經有提示，防止重複
    if (!element) return; // 保護措施，如果元素不存在就不執行
    if (element.querySelector('.step-marker-' + stepNumber)) return;

    const marker = document.createElement('span');
    marker.className = 'step-marker ' + markerClass; // 加入新的 class
    marker.textContent = stepNumber;
    element.appendChild(marker);
}

// *** 修正：移除所有步驟提示的函式 ***
function removeAllStepMarkers() {
    document.querySelectorAll('.step-marker').forEach(marker => marker.remove());
}


// 生成卡片
function generateCurrentCard() {
    removeAllStepMarkers(); // 先移除所有舊的提示
    
    const card = document.getElementById('wordCard');
    card.innerHTML = ''; 
    card.className = 'word-card'; 

    if (shuffleWords.length === 0) {
        card.innerHTML = '<div class="word-number">沒有單字可以練習，請點「設定單字」加入。</div>';
        
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        
        return;
    }

    const wordObject = shuffleWords[currentIndex];
    
    const englishWord = wordObject.word;
    const chineseWord = wordObject.translation;

    const wordNumber = document.createElement('div');
    wordNumber.className = 'word-number';
    wordNumber.textContent = `${currentIndex + 1} / ${shuffleWords.length} 個單字`;

    const wordDisplay = document.createElement('div');
    wordDisplay.className = 'word-display';
    wordDisplay.textContent = englishWord; 

    const wordControls = document.createElement('div');
    wordControls.className = 'word-controls';

    const speakBtn = document.createElement('button');
    speakBtn.className = 'speak-btn';
    speakBtn.textContent = '美式發音 + 中文';
    speakBtn.onclick = () => speakWordAndTranslation(englishWord, chineseWord, "en-US"); 

    const speakBtnUK = document.createElement('button');
    speakBtnUK.className = 'speak-btn';
    speakBtnUK.textContent = '英式發音 + 中文';
    speakBtnUK.onclick = () => speakWordAndTranslation(englishWord, chineseWord, "en-GB"); 

    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.className = 'word-input';
    wordInput.id = 'currentInput';
    wordInput.placeholder = '請輸入單字...';
    wordInput.onkeypress = (event) => handleEnterKey(event, wordObject);
    wordInput.onfocus = () => {
        setTimeout(() => {
            wordInput.focus();
        }, 0);
    };

    const checkBtn = document.createElement('button');
    checkBtn.className = 'check-btn';
    checkBtn.textContent = '檢查';
    checkBtn.onclick = () => checkCurrentWord(wordObject);

    const result = document.createElement('div');
    result.className = 'result';
    result.id = 'currentResult';

    const translationDisplay = document.createElement('div');
    translationDisplay.className = 'translation-display';
    translationDisplay.id = 'translationDisplay';

    const sentenceDisplay = document.createElement('div');
    sentenceDisplay.className = 'sentence-display';
    sentenceDisplay.id = 'sentenceDisplay';


    const speakBtnGroup = document.createElement('div');
    speakBtnGroup.className = 'speak-btn-group';
    speakBtnGroup.appendChild(speakBtn);
    speakBtnGroup.appendChild(speakBtnUK);

    wordControls.appendChild(speakBtnGroup);
    wordControls.appendChild(wordInput);
    wordControls.appendChild(checkBtn);

    card.appendChild(wordNumber);
    card.appendChild(wordDisplay);
    card.appendChild(wordControls);
    card.appendChild(result);
    card.appendChild(translationDisplay); 
    card.appendChild(sentenceDisplay); 

    if (results.hasOwnProperty(currentIndex)) {
        displayPreviousResult();
    } else {
        wordDisplay.style.display = 'none';
        
        // *** 修正：加入步驟提示 ***
        addStepMarker(speakBtnGroup, '①', 'step-marker-1');
        addStepMarker(wordControls, '②', 'step-marker-2'); // 附加到父層
        addStepMarker(wordControls, '③', 'step-marker-3'); // 附加到父層
    }
}

// 顯示結果 (用於切換卡片時)
function displayPreviousResult() {
    removeAllStepMarkers(); // 移除提示

    const isCorrect = results[currentIndex];
    const resultEl = document.getElementById('currentResult');
    const translationEl = document.getElementById('translationDisplay'); 
    const sentenceEl = document.getElementById('sentenceDisplay'); 
    const cardElement = document.getElementById('wordCard');
    const wordDisplayEl = document.querySelector('#wordCard .word-display'); 

    const wordObject = shuffleWords[currentIndex];
    const word = wordObject.word;
    const translation = wordObject.translation;
    const sentence_en = wordObject.sentence_en;
    const sentence_zh = wordObject.sentence_zh;

    if (isCorrect) {
        resultEl.innerHTML = '正確！';
        resultEl.className = 'result correct';
        cardElement.className = 'word-card correct';
    } else {
        resultEl.innerHTML = `錯誤！正確答案是 ${word}`;
        resultEl.className = 'result incorrect';
        cardElement.className = 'word-card incorrect';
    }

    translationEl.innerHTML = `<span class="translation">${translation}</span>`;
    
    // *** 修正：正確建立按鈕和事件 ***
    const sentenceEnSpan = document.createElement('span');
    sentenceEnSpan.className = 'sentence-en';
    sentenceEnSpan.textContent = sentence_en;

    const sentenceSpeakBtn = document.createElement('button');
    sentenceSpeakBtn.className = 'sentence-speak-btn';
    sentenceSpeakBtn.innerHTML = '🔊';
    sentenceSpeakBtn.onclick = () => speakWord(sentence_en.replace(/'/g, "\\'"), 'en-US');
    
    // *** 修正：將提示 ④ 附加到按鈕上 ***
    addStepMarker(sentenceSpeakBtn, '④', 'step-marker-4');

    const sentenceZhSpan = document.createElement('span');
    sentenceZhSpan.className = 'sentence-zh';
    sentenceZhSpan.textContent = sentence_zh;

    sentenceEl.appendChild(sentenceEnSpan);
    sentenceEl.appendChild(sentenceSpeakBtn);
    sentenceEl.appendChild(document.createElement('br'));
    sentenceEl.appendChild(sentenceZhSpan);
    // --- 修正結束 ---
    
    if(wordDisplayEl) {
        wordDisplayEl.style.display = 'block';
    }
    
    const inputElement = document.getElementById('currentInput');
    const checkButton = document.querySelector('#wordCard .check-btn');
    if(inputElement) inputElement.disabled = true;
    if(checkButton) checkButton.disabled = true;

    // *** 修正：將提示 ⑤ 附加到「下一張」按鈕上 ***
    addStepMarker(document.getElementById('nextBtn'), '⑤', 'step-marker-5');
}


// 更新導航按鈕
function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const cardInfo = document.getElementById('cardInfo');
    
    if (prevBtn) prevBtn.disabled = currentIndex === 0 || shuffleWords.length === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === shuffleWords.length - 1 || shuffleWords.length === 0;
    if (cardInfo) cardInfo.textContent = shuffleWords.length === 0 ? "N/A" : `${currentIndex + 1} / ${shuffleWords.length}`;
}

// 上一張卡片
function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        generateCurrentCard();
        updateNavigation();
    }
}

// 下一張卡片
function nextCard() {
    if (currentIndex < shuffleWords.length - 1) {
        currentIndex++;
        generateCurrentCard();
        updateNavigation();
    }
}

// 發音功能 (只播單一語言，給例句 🔊 使用)
function speakWord(word, lang = "en-US") {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = lang;
        utterance.rate = 0.8;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
        
        setTimeout(() => {
            const inputElement = document.getElementById('currentInput');
            if (inputElement && !inputElement.disabled) { 
                inputElement.focus();
            }
        }, 0);
    } else {
        alert('您的瀏覽器不支援語音合成功能');
    }
}

// 發音功能 (播放英文單字 + 中文翻譯)
function speakWordAndTranslation(englishWord, chineseWord, englishLang = "en-US") {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 

        const utteranceEN = new SpeechSynthesisUtterance(englishWord);
        utteranceEN.lang = englishLang;
        utteranceEN.rate = 0.8;
        utteranceEN.volume = 1;

        const utteranceZH = new SpeechSynthesisUtterance(chineseWord);
        utteranceZH.lang = 'zh-TW'; 
        utteranceZH.rate = 0.8;
        utteranceZH.volume = 1;

        utteranceEN.onend = function() {
            window.speechSynthesis.speak(utteranceZH);
        };

        window.speechSynthesis.speak(utteranceEN);

        setTimeout(() => {
            const inputElement = document.getElementById('currentInput');
            if (inputElement && !inputElement.disabled) { 
                inputElement.focus();
            }
        }, 0);
    } else {
        alert('您的瀏覽器不支援語音合成功能');
    }
}


// 檢查答案
function checkCurrentWord(wordObject) { 
    removeAllStepMarkers(); // 移除 ①②③
    
    const index = currentIndex;
    const input = document.getElementById('currentInput');
    const resultEl = document.getElementById('currentResult');
    const translationEl = document.getElementById('translationDisplay'); 
    const sentenceEl = document.getElementById('sentenceDisplay'); 
    const wordCard = document.getElementById('wordCard');
    const wordDisplayEl = document.querySelector('#wordCard .word-display'); 

    if (input.disabled) return; 

    const correctWord = wordObject.word;
    const translation = wordObject.translation;
    const sentence_en = wordObject.sentence_en;
    const sentence_zh = wordObject.sentence_zh;

    const userInput = input.value.trim().toLowerCase();
    const isCorrect = userInput === correctWord.toLowerCase();
    results[index] = isCorrect; 

    if (isCorrect) {
        resultEl.innerHTML = '正確！';
        resultEl.className = 'result correct';
        wordCard.className = 'word-card correct';
    } else {
        resultEl.innerHTML = `錯誤！正確答案是 ${correctWord}`;
        resultEl.className = 'result incorrect';
        wordCard.className = 'word-card incorrect';
    }
    
    translationEl.innerHTML = `<span class="translation">${translation}</span>`;
    
    // *** 修正：正確建立按鈕和事件 ***
    const sentenceEnSpan = document.createElement('span');
    sentenceEnSpan.className = 'sentence-en';
    sentenceEnSpan.textContent = sentence_en;

    const sentenceSpeakBtn = document.createElement('button');
    sentenceSpeakBtn.className = 'sentence-speak-btn';
    sentenceSpeakBtn.innerHTML = '🔊';
    sentenceSpeakBtn.onclick = () => speakWord(sentence_en.replace(/'/g, "\\'"), 'en-US');
    
    // *** 修正：將提示 ④ 附加到按鈕上 ***
    addStepMarker(sentenceSpeakBtn, '④', 'step-marker-4');

    const sentenceZhSpan = document.createElement('span');
    sentenceZhSpan.className = 'sentence-zh';
    sentenceZhSpan.textContent = sentence_zh;

    sentenceEl.appendChild(sentenceEnSpan);
    sentenceEl.appendChild(sentenceSpeakBtn);
    sentenceEl.appendChild(document.createElement('br'));
    sentenceEl.appendChild(sentenceZhSpan);
    // --- 修正結束 ---

    if(wordDisplayEl) {
        wordDisplayEl.style.display = 'block';
    }
    
    input.disabled = true;
    document.querySelector('#wordCard .check-btn').disabled = true;

    const stats = updateStats(); // 更新統計並取得回傳值

    // *** 修正：將提示 ⑤ 附加到「下一張」按鈕上 ***
    addStepMarker(document.getElementById('nextBtn'), '⑤', 'step-marker-5');

    // *** 檢查是否全部完成 ***
    if (stats.checkedWords === stats.totalWords && stats.totalWords > 0) {
        setTimeout(() => {
            alert(`🎉 恭喜完成！🎉\n\n您完成了 ${stats.totalWords} 題測驗。\n答對：${stats.correctWords} 題\n答錯：${stats.incorrectWords} 題\n答對率：${stats.accuracy}%\n\n繼續努力學習！`);
        }, 500); // 延遲 0.5 秒，讓畫面先顯示答案
    }
}

// 處理 Enter 鍵
function handleEnterKey(event, wordObject) { 
    if (event.key === 'Enter') {
        checkCurrentWord(wordObject); 
    }
}

// 重置所有進度
function resetAll() {
    results = {};
    currentIndex = 0;
    shuffleAndReset(); 
    updateNavigation();
    updateStats();
}

// 更新統計數據
function updateStats() {
    const totalWords = shuffleWords.length;
    const checkedWords = Object.keys(results).length;
    const correctWords = Object.values(results).filter(result => result).length;
    const incorrectWords = checkedWords - correctWords;
    const accuracy = checkedWords > 0 ? Math.round((correctWords / checkedWords) * 100) : 0;

    document.getElementById('totalWords').textContent = totalWords;
    document.getElementById('correctCount').textContent = correctWords;
    document.getElementById('incorrectCount').textContent = incorrectWords;
    document.getElementById('accuracy').textContent = accuracy + '%';
    document.getElementById('practicedCount').textContent = checkedWords;
    
    // 回傳統計物件，供完成檢查使用
    return { totalWords, checkedWords, correctWords, incorrectWords, accuracy };
}

// 開啟設定視窗
function openWordSettings() {
    const modal = document.getElementById('wordSettingsModal');
    modal.style.display = 'flex'; 
    
    // *** 修正：不再顯示題庫答案，只顯示空白 ***
    document.getElementById('customWordsTextarea').value = ''; 
    document.getElementById('customWordsTextarea').focus();
}

// 關閉設定視窗
function closeWordSettings() {
    document.getElementById('wordSettingsModal').style.display = 'none'; 
}

// 儲存設定
function saveWordSettings() {
    const text = document.getElementById('customWordsTextarea').value;
    const newWordsStrings = text.split('\n').map(w => w.trim()).filter(w => w);
    
    if (newWordsStrings.length === 0) {
        alert('請至少輸入一個單字');
        return;
    }

    const newWordsObjects = newWordsStrings.map(w => ({
        word: w,
        translation: '（自訂單字）',
        sentence_en: '（無例句）',
        sentence_zh: '（無例句）'
    }));

    words = newWordsObjects; 
    localStorage.setItem('customWords', JSON.stringify(newWordsObjects));
    
    shuffleAndReset(); 
    closeWordSettings(); 
}

// 「恢復預設」的函式
function restoreDefaultWords() {
    if (confirm("您確定要清除所有自訂單字，並恢復為預設題庫嗎？")) {
        localStorage.removeItem('customWords'); 
        alert("已恢復預設題庫，網頁將會重新整理。");
        window.location.reload(); 
    }
}

// 控制說明區塊
function toggleGuide() {
    const content = document.getElementById('guideContent');
    if (content.style.display === 'block') {
        content.style.display = 'none';
    } else {
        content.style.display = 'block';
    }
}