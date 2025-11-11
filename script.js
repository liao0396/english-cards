// 這是 'script.js' 檔案
// [最終遊戲化整合版] v24 - (v23 + 動態題庫載入)

// 'words' 變數 - 用來存放 "目前" 正在練習的題庫 (已合併單元)
let words = []; 

let shuffleWords = []; 
let results = {}; 
let currentIndex = 0;
let currentLevel = 'level1_element'; // 預設等級 (國小)
let currentHanlinGrade = ''; // 紀錄當前選擇的翰林年級 (例如 grade_7A)

// --- 遊戲化全域變數 ---
let totalXP = 0;
let currentStreak = 0;
let unlockedBadges = [];
let quizLengthLimit = 100;

// --- [新增] Firebase 相關變數 ---
let currentUser = null; // 儲存目前登入的使用者
let db; // Firestore 資料庫實例

// [V24 - 新增] 題庫快取
const loadedWordLists = {};

// [新增] 您的 Firebase 設定金鑰
const firebaseConfig = {
  apiKey: "AIzaSyBn6F5H_ke9tSicSKpK15HG-FAVOu0T6Z0",
  authDomain: "my-word-quiz.firebaseapp.com",
  projectId: "my-word-quiz",
  storageBucket: "my-word-quiz.firebasestorage.app",
  messagingSenderId: "40866188271",
  appId: "1:40866188271:web:74195eeec39d13744f041a",
  measurementId: "G-S4LT7XNT6G"
};

// [修改 v20] 寵物進化設定 (擴充至 10 級)
const petLevels = [
    { xp: 0,    name: '學習新星', image: '🥚' },
    { xp: 100,  name: '見習學徒', image: '🐣' },
    { xp: 500,  name: '小小探險家', image: '🦖' },
    { xp: 1500, name: '單字獵人', image: '🦕' },
    { xp: 3000, name: '翰林學者', image: '🐉' },
    { xp: 6000, name: '單字大師', image: '👑🐉' },
    { xp: 10000,name: '烈焰巨龍', image: '🔥🐉' },
    { xp: 18000,name: '寒冰巨龍', image: '🧊🐉' },
    { xp: 30000,name: '雷霆聖龍', image: '⚡🐉' },
    { xp: 50000,name: '單字之神', image: '✨🐉' }
];

// [修改 v20] 徽章成就設定 (擴充至 15 個)
const allBadges = {
    // 累積徽章
    'first_correct': { icon: '✅', title: '踏出第一步', desc: '第一次答對單字' },
    'correct_10': { icon: '🔟', title: '小小成就', desc: '累積答對 10 題' },
    'correct_50': { icon: '5️⃣0️⃣', title: '穩定進步', desc: '累積答對 50 題' },
    'correct_100': { icon: '💯', title: '百詞斬', desc: '累積答對 100 題' },
    'correct_500': { icon: '5️⃣0️⃣0️⃣', title: '詞彙忍者', desc: '累積答對 500 題' },
    'correct_1000': { icon: '🏆', title: '千詞達人', desc: '累積答對 1000 題' },
    
    // 連擊徽章
    'streak_5': { icon: '🔥', title: '連擊好手', desc: '連續答對 5 題' },
    'streak_10': { icon: '💥', title: '火力全開', desc: '連續答對 10 題' },
    'streak_25': { icon: '🚀', title: '勢不可擋', desc: '連續答對 25 題' },

    // 技巧徽章
    'perfect_quiz': { icon: '🎯', title: '完美測驗', desc: '在一次測驗中 (至少20題) 達到 100% 答對率' },
    'perfect_100': { icon: '💎', title: '完美無瑕', desc: '在 100 題的測驗中達到 100% 答對率' },

    // 探索徽章
    'custom_user': { icon: '✏️', title: '自造者', desc: '完成一次自訂題庫測驗' },
    'hanlin_user': { icon: '📘', title: '翰林學霸', desc: '完成一次翰林專區測驗' },
    'junior_pass': { icon: '🧑‍🎓', title: '國中畢業', desc: '完成一次國中等級測驗' },
    'senior_pass': { icon: '🏛️', title: '高中畢業', desc: '完成一次高中等級測驗' }
};
// --- (遊戲化變數結束) ---

// [V24 - 移除] baseWordLists 變數已移除

// 頁面載入時初始化
window.onload = init;

function init() {
    // [V24 - 移除] 移除對 baseWordLists 的檢查
    
    try {
        // [新增] 初始化 Firebase
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(); // 取得 Firestore 資料庫實例

        // [新增] 監聽登入狀態
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // 使用者已登入
                currentUser = user;
                handleUserLogin(user);
            } else {
                // 使用者已登出
                currentUser = null;
                handleUserLogout();
            }
        });
    } catch (e) {
        console.error("Firebase 初始化失敗:", e);
        alert("Firebase 服務載入失敗！\n雲端同步功能將無法使用，但您仍可以訪客身分繼續。");
        // 即使 Firebase 失敗，還是要以訪客模式載入
        handleUserLogout();
    }
}

/**
 * [新增] 處理使用者登入
 */
function handleUserLogin(user) {
    // 更新 UI
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('userName').textContent = user.displayName || '使用者';
    document.getElementById('authButton').style.display = 'none';
    document.getElementById('signOutButton').style.display = 'block';
    
    // 從 Firestore 載入雲端資料
    loadDataFromFirestore();
}

/**
 * [新增] 處理使用者登出 (或以訪客身分瀏覽)
 */
function handleUserLogout() {
    // 更新 UI
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('authButton').style.display = 'block';
    document.getElementById('signOutButton').style.display = 'none';
    
    // 登出後，載入本機 (localStorage) 的資料
    loadDataFromLocalStorage();
}

/**
 * [新增] 從 Google 登入
 */
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            // 登入成功，onAuthStateChanged 會自動觸發 handleUserLogin
        })
        .catch((error) => {
            console.error("Google 登入失敗:", error);
            alert("Google 登入失敗：" + error.message);
        });
}

/**
 * [新增] 從 Facebook 登入
 */
function signInWithFacebook() {
    // 1. 建立一個 Facebook provider
    const provider = new firebase.auth.FacebookAuthProvider();
    
    // 2. (可選) 向 Facebook 要求額外權限，例如 email
    // provider.addScope('email');

    // 3. 執行彈窗登入
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            // -----------------------------------------------------------
            // 登入成功！
            // onAuthStateChanged 會自動被觸發
            // 並呼叫 handleUserLogin()
            // 所以你不需要在這裡做任何事
            // -----------------------------------------------------------
        })
        .catch((error) => {
            console.error("Facebook 登入失敗:", error);

            // 處理常見錯誤
            if (error.code === 'auth/account-exists-with-different-credential') {
                alert('登入失敗！\n您的 email 可能已經用 Google 登入過了。\nFirebase 偵測到 email 相同，但登入方式不同。');
            } else if (error.code === 'auth/cancelled-popup-request') {
                // 使用者關閉了彈窗，不需要跳出錯誤
            } else {
                alert("Facebook 登入失敗：" + error.message);
            }
        });
}

/**
 * [新增] 登出
 */
function signOutUser() {
    // 登出前，最後儲存一次資料
    saveDataToFirestore(); 
    
    firebase.auth().signOut()
        .then(() => {
            // 登出成功，onAuthStateChanged 會自動觸發 handleUserLogout
            alert("您已成功登出。");
        })
        .catch((error) => {
            console.error("登出失敗:", error);
        });
}

/**
 * [新增] 將所有資料儲存到雲端 (如果已登入)
 */
function saveDataToFirestore() {
    // 如果使用者沒有登入 (currentUser 是 null)，就什麼都不做
    if (!currentUser) {
        return; 
    }
    
    const uid = currentUser.uid;
    
    const dataToSave = {
        totalXP: totalXP,
        unlockedBadges: unlockedBadges,
        quizLengthLimit: quizLengthLimit,
        customWords: localStorage.getItem('customWords') || '[]', // 自訂單字也一起備份
        currentWordLevel: localStorage.getItem('currentWordLevel') || 'level1_element'
    };
    
    // 使用 set 搭配 { merge: true } 來更新或建立文件，避免覆蓋
    db.collection('users').doc(uid).set(dataToSave, { merge: true })
        .catch((error) => {
            console.error("儲存到 Firestore 失敗:", error);
        });
}

/**
 * [新增] 從雲端載入資料
 */
function loadDataFromFirestore() {
    if (!currentUser) return;
    
    db.collection('users').doc(currentUser.uid).get()
        .then((doc) => {
            if (doc.exists) {
                // 如果雲端有資料
                const data = doc.data();
                
                // 1. 合併雲端和本機資料 (優先使用雲端)
                totalXP = data.totalXP || 0;
                unlockedBadges = data.unlockedBadges || [];
                quizLengthLimit = data.quizLengthLimit || 100;
                
                // 將雲端資料寫回 localStorage，確保同步
                localStorage.setItem('totalXP', totalXP);
                localStorage.setItem('unlockedBadges', JSON.stringify(unlockedBadges));
                localStorage.setItem('quizLengthLimit', quizLengthLimit);
                localStorage.setItem('customWords', data.customWords || '[]');
                localStorage.setItem('currentWordLevel', data.currentWordLevel || 'level1_element');
                
                alert("雲端紀錄同步成功！");

            } else {
                // 雲端沒有資料 (第一次登入)
                // 將目前本機(訪客)的資料上傳到雲端
                alert("歡迎您！系統將把您目前的本機紀錄上傳到雲端...");
                saveDataToFirestore();
            }
            
            // 載入完資料後，初始化頁面
            initializeAppState();
            
        }).catch((error) => {
            console.error("從 Firestore 載入失敗:", error);
            alert("載入雲端紀錄失敗，將使用本機紀錄。");
            // 即使載入失敗，也用本機資料初始化
            loadDataFromLocalStorage();
        });
}

/**
 * [新增] 從本機 (LocalStorage) 載入資料 (訪客模式)
 */
function loadDataFromLocalStorage() {
    totalXP = parseInt(localStorage.getItem('totalXP') || '0', 10);
    unlockedBadges = JSON.parse(localStorage.getItem('unlockedBadges') || '[]');
    quizLengthLimit = parseInt(localStorage.getItem('quizLengthLimit') || '100', 10);
    // customWords 和 currentLevel 會在 initializeAppState 中載入

    initializeAppState();
}

// [V24 - 新增] 動態載入題庫檔案的函式
/**
 * @param {string} level - 要載入的等級名稱 (例如 'level1_element' 或 'level6_hanlin')
 * @returns {Promise<boolean>} - 回傳一個 Promise，表示是否載入成功
 */
function loadWordListFile(level) {
    return new Promise((resolve, reject) => {
        let fileName = level;
        
        // 翰林專區共用一個檔案
        if (level.startsWith('grade_')) {
            fileName = 'level6_hanlin';
        }

        // 如果已經載入過，就直接成功
        if (loadedWordLists[fileName]) {
            resolve(true);
            return;
        }

        // 如果是自訂題庫，也不需載入檔案
        if (fileName === 'custom') {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = `./${fileName}.js`; // 假設檔案放在同一個目錄
        
        script.onload = () => {
            console.log(`${fileName}.js 已成功載入。`);
            // 載入成功後，window[levelData_XXX] 變數會被建立
            // 我們把它存到快取中
            if (window[`levelData_${fileName}`]) {
                loadedWordLists[fileName] = window[`levelData_${fileName}`];
                resolve(true);
            } else {
                console.error(`載入 ${fileName}.js 失敗：找不到 levelData_${fileName} 變數。`);
                reject(new Error(`Failed to load word list variable from ${fileName}.js`));
            }
        };
        
        script.onerror = () => {
            console.error(`載入 ${fileName}.js 失敗。`);
            alert(`錯誤：無法載入 '${fileName}.js' 題庫檔案！`);
            reject(new Error(`Failed to load ${fileName}.js`));
        };
        
        document.body.appendChild(script);
    });
}


/**
 * [V24 - 修改] 統一的初始化函式 (改為 async)
 */
async function initializeAppState() {
    document.getElementById('quizLengthInput').value = quizLengthLimit;
    
    currentLevel = localStorage.getItem('currentWordLevel') || 'level1_element';
    
    // [V24 - 修改] 修正：如果上次在翰林，應該要能正確載入
    if (currentLevel === 'level6_hanlin') {
        currentLevel = 'level1_element'; // 強制改回預設
        localStorage.setItem('currentWordLevel', 'level1_element');
    }

    // [V24 - 修改] 載入題庫
    try {
        await loadWordList(currentLevel); // 等待預設題庫載入
    } catch (e) {
        console.error("初始化載入題庫失敗:", e);
        // 即使失敗也要繼續，UI 會顯示題庫為空
    }
    
    // 更新介面
    updateActiveTab(currentLevel);
    shuffleAndReset(); 
    updateStats();
    updateNavigation();
    updateControlsText();
    updatePetDisplay();

    // [V24 - 修改] 處理上次在翰林專區的情況
    if (currentLevel.startsWith('grade_')) {
        showHanlinPanel();
        await showHanlinUnits(currentLevel); // 載入單元
        updateActiveTab(currentLevel); // 更新翰林分頁
    }
}


/**
 * [V24 - 修改] 載入指定等級的單字到 'words' 變數中 (改為 async)
 */
async function loadWordList(level) {
    let wordList = [];
    
    try {
        // V24 - 步驟 1: 確保題庫檔案已被載入
        await loadWordListFile(level);

        // V24 - 步驟 2: 從快取中取得題庫資料
        if (level === 'custom') {
            const customWords = JSON.parse(localStorage.getItem('customWords')) || [];
            wordList = customWords;
        } 
        else if (level.startsWith('level') && level !== 'level6_hanlin') {
            wordList = loadedWordLists[level] || [];
            if (wordList.length === 0 && level !== 'level1_element') {
                 alert(`「${level.replace('level', '').replace('_', ' ').toUpperCase()}」等級的題庫是空的，請選擇其他等級。`);
            }
        }
        else if (level.startsWith('grade_')) {
             const hanlinData = loadedWordLists['level6_hanlin'] || {};
             const gradeData = hanlinData[level];
             if (!gradeData || Object.keys(gradeData).length === 0) {
                 alert(`「${level}」的題庫為空。請選擇其他等級。`);
             }
             words = []; 
             currentLevel = level;
             localStorage.setItem('currentWordLevel', level);
             saveDataToFirestore(); // [新增] 儲存狀態
             return; // 翰林模式在此結束
        }
        
        words = wordList;
        currentLevel = level;
        localStorage.setItem('currentWordLevel', level);
        saveDataToFirestore(); // [新增] 儲存狀態

    } catch (error) {
        console.error(`loadWordList 時發生錯誤 (level: ${level}):`, error);
        words = []; // 載入失敗時，清空題庫
    }
}


/**
 * [V24 - 修改] 點擊等級按鈕時呼叫 (改為 async)
 */
async function changeLevel(newLevel) {
    if (newLevel === 'level6_hanlin') {
        await showHanlinPanel(); // V24 - 改為 await
        return;
    }
    
    await hideHanlinPanel(); // V24 - 改為 await

    if (newLevel === currentLevel && newLevel !== 'custom') {
        resetAll(true); 
        return;
    }

    await loadWordList(newLevel); // V24 - 改為 await
    updateActiveTab(newLevel);
    resetAll(true);
    updateControlsText(); 
}


// --- 翰林專區邏輯 ---

// [V24 - 修改] 改為 async
async function showHanlinPanel() {
    document.getElementById('mainTabs').style.display = 'none';
    document.getElementById('hanlinPanel').style.display = 'block';
    updateActiveTab('tab-level6_hanlin');

    if (!currentHanlinGrade || !currentHanlinGrade.startsWith('grade_')) {
        currentHanlinGrade = 'grade_7A';
    }
    
    await showHanlinUnits(currentHanlinGrade); // V24 - 改為 await
}

// [V24 - 修改] 改為 async
async function hideHanlinPanel() {
    document.getElementById('mainTabs').style.display = 'flex';
    document.getElementById('hanlinPanel').style.display = 'none';
    
    document.querySelectorAll('.grade-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    await loadWordList('level1_element'); // V24 - 改為 await
    updateActiveTab('level1_element'); 
    resetAll(true);
    updateControlsText();
}

// [V24 - 修改] 改為 async
async function showHanlinUnits(gradeKey) {
    currentHanlinGrade = gradeKey;
    const unitContainer = document.getElementById('unitCheckboxes');
    unitContainer.innerHTML = ''; 
    
    document.querySelectorAll('.grade-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeGradeTab = document.querySelector(`.grade-btn[data-grade="${gradeKey}"]`);
    if (activeGradeTab) {
        activeGradeTab.classList.add('active');
    }

    // V24 - 確保翰林題庫已載入
    try {
        await loadWordListFile('level6_hanlin');
    } catch (e) {
        unitContainer.innerHTML = `<div class="unit-message">錯誤：無法載入翰林題庫檔案！</div>`;
        return;
    }

    const hanlinData = loadedWordLists['level6_hanlin'] || {};
    const gradeData = hanlinData[gradeKey];
    
    if (!gradeData || Object.keys(gradeData).length === 0) {
        unitContainer.innerHTML = `<div class="unit-message">「${gradeKey}」的題庫為空！請手動新增資料。</div>`;
        return;
    }

    const unitKeys = Object.keys(gradeData);

    unitKeys.forEach(unitKey => {
        const wordCount = gradeData[unitKey].length;
        const label = document.createElement('label');
        label.className = 'unit-checkbox-item';
        
        const inputId = `${gradeKey}-${unitKey}`;
        
        label.innerHTML = `
            <input type="checkbox" id="${inputId}" name="hanlinUnit" value="${unitKey}" onclick="updateControlsText()">
            <span style="font-weight: bold;">${unitKey}</span> (${wordCount} 詞)
        `;
        unitContainer.appendChild(label);
    });
}

function toggleSelectAllUnits(checkStatus) {
    document.querySelectorAll('#unitCheckboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = checkStatus;
    });
    updateControlsText(); 
}

// [V24 - 修改] 改為 async
async function startHanlinQuiz() {
    const checkedUnits = [];
    const unitCheckboxes = document.querySelectorAll('#unitCheckboxes input[type="checkbox"]:checked');
    
    unitCheckboxes.forEach(checkbox => {
        checkedUnits.push(checkbox.value);
    });

    if (checkedUnits.length === 0) {
        alert('請至少選擇一個單元才能開始測驗！');
        return;
    }

    // V24 - 確保翰林題庫已載入 (雖然 showHanlinUnits 應該做過了，但保險起見)
    try {
        await loadWordListFile('level6_hanlin');
    } catch (e) {
        alert("錯誤：無法載入翰林題庫，請稍後再試。");
        return;
    }

    let combinedWords = [];
    const hanlinData = loadedWordLists['level6_hanlin'] || {};
    const gradeData = hanlinData[currentHanlinGrade];

    if (!gradeData) {
        alert('題庫資料載入錯誤，請返回主等級再試一次。');
        return;
    }

    checkedUnits.forEach(unitKey => {
        const unitList = gradeData[unitKey];
        if (unitList && unitList.length > 0) {
            combinedWords = combinedWords.concat(unitList);
        }
    });

    if (combinedWords.length === 0) {
        alert('所選單元中沒有任何單字，請檢查題庫資料。');
        return;
    }

    words = combinedWords;
    currentLevel = currentHanlinGrade; 
    localStorage.setItem('currentWordLevel', currentHanlinGrade);
    saveDataToFirestore(); // [新增] 儲存狀態
    
    document.getElementById('mainTabs').style.display = 'flex'; 
    document.getElementById('hanlinPanel').style.display = 'none'; 
    
    updateActiveTab('level6_hanlin'); 
    shuffleAndReset();
    updateControlsText(); 
}


function updateActiveTab(activeLevelId = currentLevel) {
    document.querySelectorAll('.level-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const mainTabId = activeLevelId.startsWith('grade_') ? 'tab-level6_hanlin' : 'tab-' + activeLevelId;

    const activeTab = document.getElementById(mainTabId);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    document.querySelectorAll('.grade-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (activeLevelId.startsWith('grade_')) {
        const activeGradeTab = document.querySelector(`.grade-btn[data-grade="${activeLevelId}"]`);
        if (activeGradeTab) {
            activeGradeTab.classList.add('active');
        }
    }
}

function updateQuizLength() {
    const input = document.getElementById('quizLengthInput');
    let length = parseInt(input.value, 10);

    if (isNaN(length) || length < 10) {
        length = 10;
        alert("測驗題數最少為 10 題。");
    }
    
    input.value = length; 
    quizLengthLimit = length;
    
    // [修改] 儲存到本機並嘗試同步
    localStorage.setItem('quizLengthLimit', length);
    saveDataToFirestore(); 
    
    updateControlsText();
    shuffleAndReset();
}

function updateControlsText() {
    const currentQuizLimit = quizLengthLimit;

    const startQuizBtn = document.querySelector('.btn-start-quiz');
    if (startQuizBtn && document.getElementById('hanlinPanel').style.display === 'block' && currentHanlinGrade) {
        
        // V24 - 從快取讀取
        const hanlinData = loadedWordLists['level6_hanlin'] || {};
        const gradeData = hanlinData[currentHanlinGrade];

        let combinedWords = [];
        if(gradeData) {
            const checkedUnits = document.querySelectorAll('#unitCheckboxes input[type="checkbox"]:checked');
            
            checkedUnits.forEach(checkbox => {
                const unitList = gradeData[checkbox.value];
                if (unitList && unitList.length > 0) {
                    combinedWords = combinedWords.concat(unitList);
                }
            });
        }

        const selectedWordsCount = combinedWords.length;
        const quizLimitHanlin = Math.min(selectedWordsCount, currentQuizLimit);

        if (selectedWordsCount === 0) {
             startQuizBtn.textContent = '開始測驗';
        } else if (selectedWordsCount <= currentQuizLimit) {
             startQuizBtn.textContent = `開始測驗 (共 ${quizLimitHanlin} 題)`;
        } else {
             startQuizBtn.textContent = `開始測驗 (抽取 ${currentQuizLimit} 題)`;
        }
    }

    const shuffleBtn = document.getElementById('shuffleButton'); 
    const totalWordsCount = words.length;
    const quizLimit = Math.min(totalWordsCount, currentQuizLimit);

    if (totalWordsCount === 0) {
        shuffleBtn.textContent = '重新排序 (題庫為空)';
    } else if (totalWordsCount <= currentQuizLimit) {
        shuffleBtn.textContent = `重新排序 (共 ${quizLimit} 題)`;
    } else {
        shuffleBtn.textContent = `重新排序 (抽取 ${currentQuizLimit} 題)`;
    }
}


function shuffleAndReset() {
    if (!words || words.length === 0) {
        shuffleWords = []; 
    } else {
        let shuffledFullList = [...words].sort(() => Math.random() - 0.5);
        
        const quizLimit = Math.min(shuffledFullList.length, quizLengthLimit);
        shuffleWords = shuffledFullList.slice(0, quizLimit);
    }

    results = {}; 
    currentIndex = 0;
    currentStreak = 0; 
    generateCurrentCard();
    updateNavigation();
    updateStats();
    updateControlsText(); 
}

function generateCurrentCard() {
    removeAllStepMarkers(); 
    const card = document.getElementById('wordCard');
    card.innerHTML = ''; 
    card.className = 'word-card'; 

    if (shuffleWords.length === 0) {
        card.innerHTML = `<div class="word-number">題庫是空的！<br>請選擇其他等級，或點「設定單字」加入自訂單字。</div>`;
        
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
        
        addStepMarker(speakBtnGroup, '①', 'step-marker-1');
        addStepMarker(wordControls, '②', 'step-marker-2'); 
        addStepMarker(wordControls, '③', 'step-marker-3'); 
    }
}

function displayPreviousResult() {
    removeAllStepMarkers(); 

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

    if (currentLevel === 'custom') {
        if (translation === '（自動翻譯）') {
            fetchTranslation(word, translationEl);
        } else {
            translationEl.innerHTML = `<span class="translation">${translation}</span>`;
        }
    } else {
        translationEl.innerHTML = `<span class="translation">${translation}</span>`;
    }
    
    const sentenceEnSpan = document.createElement('span');
    sentenceEnSpan.className = 'sentence-en';
    sentenceEnSpan.textContent = sentence_en;

    const sentenceSpeakBtn = document.createElement('button');
    sentenceSpeakBtn.className = 'sentence-speak-btn';
    sentenceSpeakBtn.innerHTML = '🔊';
    sentenceSpeakBtn.onclick = () => speakWord(sentence_en.replace(/'/g, "\\'"), 'en-US');
    
    addStepMarker(sentenceSpeakBtn, '④', 'step-marker-4'); 

    const sentenceZhSpan = document.createElement('span');
    sentenceZhSpan.className = 'sentence-zh';
    sentenceZhSpan.textContent = sentence_zh;

    sentenceEl.innerHTML = '';
    sentenceEl.appendChild(sentenceEnSpan);
    sentenceEl.appendChild(sentenceSpeakBtn);
    sentenceEl.appendChild(document.createElement('br'));
    sentenceEl.appendChild(sentenceZhSpan);

    if(wordDisplayEl) {
        wordDisplayEl.style.display = 'block';
    }
    
    const inputElement = document.getElementById('currentInput');
    const checkButton = document.querySelector('#wordCard .check-btn');
    if(inputElement) inputElement.disabled = true;
    if(checkButton) checkButton.disabled = true;

    addStepMarker(document.getElementById('nextBtn'), '⑤', 'step-marker-5');
}

function addStepMarker(targetElement, text, className) {
    if (!targetElement) return;

    if (targetElement.querySelector(`.${className}`)) return;
    
    const marker = document.createElement('span');
    marker.className = `step-marker ${className}`;
    marker.textContent = text;
    targetElement.appendChild(marker);
}

function removeAllStepMarkers() {
    document.querySelectorAll('.step-marker').forEach(marker => marker.remove());
}


function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const cardInfo = document.getElementById('cardInfo');
    
    if (prevBtn) prevBtn.disabled = currentIndex === 0 || shuffleWords.length === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === shuffleWords.length - 1 || shuffleWords.length === 0;
    if (cardInfo) cardInfo.textContent = shuffleWords.length === 0 ? "N/A" : `${currentIndex + 1} / ${shuffleWords.length}`;
}

function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        generateCurrentCard();
        updateNavigation();
    }
}

function nextCard() {
    if (currentIndex < shuffleWords.length - 1) {
        currentIndex++;
        generateCurrentCard();
        updateNavigation();
    }
}

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

function speakWordAndTranslation(englishWord, chineseWord, englishLang = "en-US") {
    if (chineseWord.includes('（') || chineseWord.includes('(')) {
        speakWord(englishWord, englishLang);
        return;
    }
    
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


function checkCurrentWord(wordObject) { 
    removeAllStepMarkers(); 
    
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
        currentStreak++;
        let xpGained = 10 + Math.min(currentStreak, 5); 
        addXP(xpGained);

        let comboText = '';
        if (currentStreak > 1) {
            comboText = `<span class="combo-streak">🔥 連續答對 ${currentStreak} 題！(+${xpGained} XP)</span>`;
        } else {
            comboText = ` (+${xpGained} XP)`;
        }

        resultEl.innerHTML = '正確！' + comboText;
        resultEl.className = 'result correct';
        wordCard.className = 'word-card correct';
        
    } else {
        currentStreak = 0;
        resultEl.innerHTML = `錯誤！正確答案是 ${correctWord}`;
        resultEl.className = 'result incorrect';
        wordCard.className = 'word-card incorrect';
    }
    
    if (currentLevel === 'custom') {
        if (translation === '（自動翻譯）') {
            fetchTranslation(correctWord, translationEl);
        } else {
            translationEl.innerHTML = `<span class="translation">${translation}</span>`;
        }
    } else {
        translationEl.innerHTML = `<span class="translation">${translation}</span>`;
    }
    
    const sentenceEnSpan = document.createElement('span');
    sentenceEnSpan.className = 'sentence-en';
    sentenceEnSpan.textContent = sentence_en;

    const sentenceSpeakBtn = document.createElement('button');
    sentenceSpeakBtn.className = 'sentence-speak-btn';
    sentenceSpeakBtn.innerHTML = '🔊';
    sentenceSpeakBtn.onclick = () => speakWord(sentence_en.replace(/'/g, "\\'"), 'en-US');
    
    addStepMarker(sentenceSpeakBtn, '④', 'step-marker-4'); 

    const sentenceZhSpan = document.createElement('span');
    sentenceZhSpan.className = 'sentence-zh';
    sentenceZhSpan.textContent = sentence_zh;

    sentenceEl.innerHTML = '';
    sentenceEl.appendChild(sentenceEnSpan);
    sentenceEl.appendChild(sentenceSpeakBtn);
    sentenceEl.appendChild(document.createElement('br'));
    sentenceEl.appendChild(sentenceZhSpan);

    if(wordDisplayEl) {
        wordDisplayEl.style.display = 'block';
    }
    
    input.disabled = true;
    document.querySelector('#wordCard .check-btn').disabled = true;

    const stats = updateStats(); 

    addStepMarker(document.getElementById('nextBtn'), '⑤', 'step-marker-5');

    if (stats.checkedWords === stats.totalWords && stats.totalWords > 0) {
        setTimeout(() => {
            alert(`🎉 恭喜完成！🎉\n\n您完成了 ${stats.totalWords} 題測驗。\n答對：${stats.correctWords} 題\n答錯：${stats.incorrectWords} 題\n答對率：${stats.accuracy}%\n\n繼續努力學習！`);
        }, 500); 
    }
}

function handleEnterKey(event, wordObject) { 
    if (event.key === 'Enter') {
        checkCurrentWord(wordObject); 
    }
}

// [V2 - 修正] 重新設計 `resetAll` 函式，使其真正重置進度
/**
 * @param {boolean} [onlyQuiz=false] - 如果為 true，則只重置目前測驗而不詢問
 */
function resetAll(onlyQuiz = false) {
    
    if (onlyQuiz) {
        // V2 新增：如果只是切換等級或按 "重新排序"，則只重置測驗
        results = {};
        currentIndex = 0;
        currentStreak = 0; 
        shuffleAndReset(); 
        updateNavigation();
        updateStats();
        return;
    }

    // [V2 - 新增] 詢問使用者是否要重設 *所有* 遊戲進度
    if (confirm("您確定要重置所有遊戲進度嗎？\n（這將會清除您的 XP、寵物等級、和所有徽章，但會保留您的自訂題庫。）")) {
        totalXP = 0;
        unlockedBadges = [];
        currentStreak = 0;
        
        localStorage.setItem('totalXP', '0');
        localStorage.setItem('unlockedBadges', '[]');
        
        saveDataToFirestore(); // 同步重設到雲端
        
        alert("所有遊戲進度已重設。");
        
        // 重設目前測驗
        results = {};
        currentIndex = 0;
        shuffleAndReset(); 
        updateNavigation();
        updateStats();
        updatePetDisplay(); // 更新寵物介面
    } else {
        // [V2 - 修改] 如果使用者按取消，就只執行舊的 "重置目前測驗" 功能
        results = {};
        currentIndex = 0;
        currentStreak = 0; 
        shuffleAndReset(); 
        updateNavigation();
        updateStats();
        alert("目前的測驗已重新開始。\n（您的 XP 和徽章進度已保留。）"); // 提示使用者發生了什麼事
    }
}


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
    
    const stats = { totalWords, checkedWords, correctWords, incorrectWords, accuracy };
    
    checkAndUnlockBadges(stats);

    return stats;
}

function openWordSettings() {
    const modal = document.getElementById('wordSettingsModal');
    modal.style.display = 'flex'; 
    
    if (currentLevel === 'custom') {
        const customWords = JSON.parse(localStorage.getItem('customWords')) || [];
        
        const textValue = customWords.map(w => {
            const s_en = (w.sentence_en && w.sentence_en !== '（無例句）') ? w.sentence_en : '';
            const s_zh = (w.sentence_zh && w.sentence_zh !== '（無例句）') ? w.sentence_zh : '';
            
            let line = w.word;
            if (s_en || s_zh) {
                line += `;${s_en}`;
            }
            if (s_zh) {
                line += `;${s_zh}`;
            }
            return line;
        }).join('\n');
        
        document.getElementById('customWordsTextarea').value = textValue;
    } else {
        document.getElementById('customWordsTextarea').value = '';
    }
    document.getElementById('customWordsTextarea').focus();
}

function closeWordSettings() {
    document.getElementById('wordSettingsModal').style.display = 'none'; 
}

// [V24 - 修改] 改為 async
async function findWordInDatabase(wordToFind) {
    if (!wordToFind) {
        return null;
    }
    const targetWord = wordToFind.toLowerCase();

    // V24 - 依序載入並搜尋
    const levelsToSearch = ['level1_element', 'level2_junior', 'level3_senior', 'level4_college', 'level5_business', 'level6_hanlin'];
    
    for (const level of levelsToSearch) {
        try {
            await loadWordListFile(level);
        } catch (e) {
            console.warn(`搜尋時載入 ${level} 失敗，跳過。`);
            continue; // 即使某個檔案載入失敗，也繼續搜尋其他檔案
        }

        const wordData = loadedWordLists[level];
        if (!wordData) continue;

        if (level !== 'level6_hanlin') {
            // Level 1-5 (Array)
            const found = wordData.find(w => w.word.toLowerCase() === targetWord);
            if (found) return found;
        } else {
            // Level 6 (Hanlin Object)
            for (const gradeKey in wordData) {
                const grade = wordData[gradeKey] || {};
                for (const unitKey in grade) {
                    const unitList = grade[unitKey] || [];
                    const found = unitList.find(w => w.word.toLowerCase() === targetWord);
                    if (found) return found;
                }
            }
        }
    }

    return null;
}

// [V24 - 修改] 改為 async
async function saveWordSettings() {
    const text = document.getElementById('customWordsTextarea').value;
    const newWordsStrings = text.split('\n').map(w => w.trim()).filter(w => w);
    
    if (newWordsStrings.length === 0) {
        alert('請至少輸入一個單字');
        return;
    }

    // V24 - 顯示一個小小的載入提示，因為搜尋可能需要時間
    alert("正在儲存並從題庫中自動搜尋翻譯...\n這可能需要幾秒鐘，請稍候。");

    const newWordsObjects = [];
    for (const w of newWordsStrings) { // V24 - 改用 for...of 迴圈才能使用 await
        const parts = w.split(';');
        const word = parts[0] ? parts[0].trim() : '';
        if (!word) continue;

        const user_s_en = parts[1] ? parts[1].trim() : '';
        const user_s_zh = parts[2] ? parts[2].trim() : '';

        let final_translation = '（自動翻譯）'; 
        let final_sentence_en = '（無例句）';
        let final_sentence_zh = '（無例句）';

        const foundWord = await findWordInDatabase(word); // V24 - 改為 await
        if (foundWord) {
            final_translation = foundWord.translation; 
            final_sentence_en = foundWord.sentence_en;
            final_sentence_zh = foundWord.sentence_zh;
        }

        if (user_s_en) {
            final_sentence_en = user_s_en;
            final_sentence_zh = user_s_zh ? user_s_zh : '（無例句）'; 
        }
        
        newWordsObjects.push({
            word: word,
            translation: final_translation, 
            sentence_en: final_sentence_en,
            sentence_zh: final_sentence_zh
        });
    }

    localStorage.setItem('customWords', JSON.stringify(newWordsObjects));
    saveDataToFirestore(); // [新增] 同步到雲端
    
    alert("自訂題庫已儲存！");
    closeWordSettings(); 
    
    await changeLevel('custom'); // V24 - 改為 await
}

// [V2 - 修正] 重新設計 `restoreDefaultWords` 函式，使其不再清除遊戲進度
function restoreDefaultWords() {
    // [V2 - 修正] 更改提示訊息，不再警告會重設進度
    if (confirm("您確定要清除所有自訂單字，並恢復為預設題庫嗎？\n（您的寵物等級和成就將會被保留。）")) {
        
        // [V2 - 修正] 只清除自訂單字
        localStorage.removeItem('customWords'); 
        
        // [V2 - 修正] 移除所有重設進度的程式碼
        // totalXP = 0;
        // unlockedBadges = [];
        // quizLengthLimit = 100;
        // localStorage.removeItem('totalXP');
        // localStorage.removeItem('unlockedBadges');
        // localStorage.removeItem('quizLengthLimit');
        
        // [V2 - 保留] 儲存變更到雲端 (這會保存現有的XP/徽章，並只清除 customWords)
        saveDataToFirestore(); 
        
        alert("自訂題庫已清除，網頁將會重新整理。");
        
        // [V2 - 保留] 切換回預設等級並重整
        localStorage.setItem('currentWordLevel', 'level1_element');
        window.location.reload(); 
    }
}


function toggleGuide() {
    const content = document.getElementById('guideContent');
    if (content.style.display === 'block') {
        content.style.display = 'none';
    } else {
        content.style.display = 'block';
    }
}

// [修改] 摺疊區塊
document.addEventListener('DOMContentLoaded', () => {
    // [修改] 摺疊區塊
    const controlsContent = document.getElementById('controlsContent');
    if (controlsContent) {
        controlsContent.style.display = 'none';
    }
    
    const statsContent = document.getElementById('statsContent');
    if (statsContent) {
        statsContent.style.display = 'none';
    }
    
    const guideContent = document.getElementById('guideContent');
    if (guideContent) {
        guideContent.style.display = 'none';
    }
});


async function fetchTranslation(word, element) {
    element.innerHTML = `<span class="translation">（正在翻譯...）</span>`;

    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-TW`);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.responseData && data.responseData.translatedText) {
            let translated = data.responseData.translatedText;
            
            if (translated.includes('NO QUERY SPECIFIED') || translated.includes('INVALID LANGUAGE PAIR')) {
                 element.innerHTML = `<span class="translation">（無法翻譯此單字）</span>`;
            } else {
                 element.innerHTML = `<span class="translation">${translated}</span>`;
            }
        } else {
            element.innerHTML = `<span class="translation">（翻譯失敗）</span>`;
        }
    } catch (error) {
        console.error('Fetch translation error:', error);
        element.innerHTML = `<span class="translation">（翻譯載入錯誤）</span>`;
    }
}


// --- 遊戲化功能函式 (v22 擴充) ---

/**
 * [新] 增加經驗值並更新 (同步)
 */
function addXP(amount) {
    totalXP += amount;
    localStorage.setItem('totalXP', totalXP); // 本機儲存
    saveDataToFirestore(); // 嘗試雲端儲存
    updatePetDisplay();
}

/**
 * [新] 更新寵物/等級介面 (含動畫)
 */
function updatePetDisplay() {
    let currentPet = petLevels[0];
    let nextLevelXP = petLevels[1].xp;

    for (let i = petLevels.length - 1; i >= 0; i--) {
        if (totalXP >= petLevels[i].xp) {
            currentPet = petLevels[i];
            
            if (i < petLevels.length - 1) {
                nextLevelXP = petLevels[i + 1].xp;
            } else {
                nextLevelXP = petLevels[i].xp; 
            }
            break;
        }
    }

    let xpForCurrentLevel = totalXP - currentPet.xp;
    let xpToNextLevel = nextLevelXP - currentPet.xp;
    let percentage = 0;
    
    if (xpToNextLevel > 0) { 
        percentage = Math.min((xpForCurrentLevel / xpToNextLevel) * 100, 100);
    } else if (totalXP >= nextLevelXP) { 
        percentage = 100;
        xpForCurrentLevel = xpToNextLevel; 
    }

    const petNameEl = document.getElementById('petName');
    
    // [新增] 檢查是否進化 (名稱是否改變)
    if (petNameEl.textContent !== currentPet.name && petNameEl.textContent !== '學習新星') { // 初始載入時不觸發
        const frameEl = document.querySelector('.pet-image-frame');
        if (frameEl) {
            frameEl.classList.add('evolve'); 
            setTimeout(() => {
                frameEl.classList.remove('evolve'); 
            }, 800); 
        }
    }

    document.getElementById('petImage').textContent = currentPet.image;
    document.getElementById('petName').textContent = currentPet.name; 
    document.getElementById('xpBarFill').style.width = `${percentage}%`;
    
    if (percentage === 100 && xpToNextLevel <= 0) { 
         document.getElementById('xpText').textContent = `XP: ${totalXP} (已滿等)`;
    } else {
         document.getElementById('xpText').textContent = `XP: ${xpForCurrentLevel} / ${xpToNextLevel}`;
    }
}

/**
 * [新] 開啟成就徽章 Modal
 */
function openBadgeModal() {
    const modal = document.getElementById('badgeModal');
    const grid = document.getElementById('badgeGrid');
    grid.innerHTML = ''; 

    for (const badgeId in allBadges) {
        const badge = allBadges[badgeId];
        const isUnlocked = unlockedBadges.includes(badgeId);

        const badgeEl = document.createElement('div');
        badgeEl.className = isUnlocked ? 'badge-item badge-unlocked' : 'badge-item badge-locked';
        
        let desc = isUnlocked ? badge.desc : '（未解鎖）';
        
        badgeEl.innerHTML = `
            <div class="badge-icon">${isUnlocked ? badge.icon : '❓'}</div>
            <div class="badge-title">${isUnlocked ? badge.title : '？？？'}</div>
            <div class="badge-desc">${desc}</div>
        `;
        grid.appendChild(badgeEl);
    }
    
    modal.style.display = 'flex';
}

function closeBadgeModal() {
    document.getElementById('badgeModal').style.display = 'none';
}

/**
 * [新] 解鎖徽章 (同步)
 */
function unlockBadge(badgeId) {
    if (!unlockedBadges.includes(badgeId)) {
        unlockedBadges.push(badgeId);
        localStorage.setItem('unlockedBadges', JSON.stringify(unlockedBadges)); // 本機儲存
        saveDataToFirestore(); // 嘗試雲端儲存
        
        const badge = allBadges[badgeId];
        setTimeout(() => {
            alert(`🎖️ 解鎖新成就！ 🎖️\n\n${badge.icon} ${badge.title}\n${badge.desc}`);
        }, 1000);
    }
}

/**
 * [修改 v20] 檢查並解鎖徽章 (擴充邏輯)
 */
function checkAndUnlockBadges(stats) {
    // 檢查累積答對 (用 XP 估算，1 題約 10-15 XP)
    if (totalXP >= 10) unlockBadge('first_correct');
    if (totalXP >= 150) unlockBadge('correct_10'); 
    if (totalXP >= 750) unlockBadge('correct_50'); 
    if (totalXP >= 1500) unlockBadge('correct_100'); 
    if (totalXP >= 7500) unlockBadge('correct_500'); 
    if (totalXP >= 15000) unlockBadge('correct_1000'); 
    
    // 檢查連擊
    if (currentStreak >= 5) unlockBadge('streak_5');
    if (currentStreak >= 10) unlockBadge('streak_10');
    if (currentStreak >= 25) unlockBadge('streak_25');

    // 檢查是否完成測驗
    if (stats.checkedWords > 0 && stats.checkedWords === stats.totalWords) {
        // 探索徽章
        if (currentLevel === 'custom') unlockBadge('custom_user');
        if (currentLevel.startsWith('grade_')) unlockBadge('hanlin_user');
        if (currentLevel === 'level2_junior') unlockBadge('junior_pass');
        if (currentLevel === 'level3_senior') unlockBadge('senior_pass');
        
        // 技巧徽章
        if (stats.accuracy === 100) {
            if (stats.totalWords >= 20) {
                unlockBadge('perfect_quiz');
            }
            if (stats.totalWords >= 100) { // 必須是 100 題的完美測驗
                unlockBadge('perfect_100');
            }
        }
    }
}


// --- [新增] 匯出/匯入功能 (僅限本機) ---

/**
 * [新] 匯出進度 (本機)
 */
function exportProgress() {
    const dataToExport = {
        totalXP: localStorage.getItem('totalXP') || '0',
        unlockedBadges: localStorage.getItem('unlockedBadges') || '[]',
        customWords: localStorage.getItem('customWords') || '[]',
        quizLengthLimit: localStorage.getItem('quizLengthLimit') || '100',
        currentWordLevel: localStorage.getItem('currentWordLevel') || 'level1_element'
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'word_quiz_progress.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('紀錄已匯出為 "word_quiz_progress.json"！');
}

/**
 * [新] 匯入進度 (本機)
 */
function importProgress() {
    // 1. 創建一個隱藏的 input[type=file]
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    // 2. 監聽 change 事件 (當使用者選擇檔案)
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        
        const reader = new FileReader();
        
        // 3. 讀取檔案內容
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                
                // 4. 驗證並儲存資料到 localStorage
                if (json.totalXP && json.unlockedBadges) {
                    localStorage.setItem('totalXP', json.totalXP);
                    localStorage.setItem('unlockedBadges', json.unlockedBadges);
                    localStorage.setItem('customWords', json.customWords || '[]');
                    localStorage.setItem('quizLengthLimit', json.quizLengthLimit || '100');
                    localStorage.setItem('currentWordLevel', json.currentWordLevel || 'level1_element');
                    
                    alert('紀錄匯入成功！網頁將重新載入以套用新進度。');
                    // 5. 重新載入頁面
                    window.location.reload();
                } else {
                    alert('匯入失敗：檔案格式不正確。');
                }
            } catch (error) {
                console.error('匯入錯誤:', error);
                alert('匯入失敗：檔案已損毀或不是有效的 JSON 檔案。');
            }
        };
        
        reader.readAsText(file);
    };
    
    // 6. 觸發點擊
    input.click();
}

// --- [新增] 摺疊區塊功能 ---

function toggleGuide() {
    const content = document.getElementById('guideContent');
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
}

function toggleControls() {
    const content = document.getElementById('controlsContent');
    content.style.display = content.style.display === 'flex' ? 'none' : 'flex';
}

function toggleStats() {
    const content = document.getElementById('statsContent');
    content.style.display = content.style.display === 'flex' ? 'none' : 'flex';
}