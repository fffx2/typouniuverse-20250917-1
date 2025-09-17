// ===================================================================================
// INITIALIZATION & GLOBAL STATE
// ===================================================================================

// 사용자의 선택을 저장하고 앱의 현재 상태를 관리하는 전역 객체
let appState = {
    service: '', platform: '',
    mood: { soft: 50, static: 50 },
    keyword: '', primaryColor: '',
    generatedResult: null // AI가 생성한 결과 저장
};
// 플랫폼별 가이드라인, 색상 정보 등을 담고 있는 로컬 데이터베이스
let knowledgeBase = {};
// AI Assistant 메시지의 타이핑 효과를 위한 타이머
let typingTimeout;

// HTML 문서가 모두 로드되면 앱 초기화 함수를 실행
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * 앱 초기화 함수
 * knowledge_base.json 데이터를 비동기적으로 불러온 후,
 * 각 페이지(메인, 실험실)의 초기 설정 및 이벤트 리스너를 등록합니다.
 */
async function initializeApp() {
    try {
        const response = await fetch('./knowledge_base.json');
        if (!response.ok) throw new Error('Network response was not ok');
        knowledgeBase = await response.json();
        
        setupNavigation(); // 페이지 간 이동(네비게이션) 설정
        initializeMainPage(); // 메인 페이지 기능 초기화
        initializeLabPage(); // 인터랙티브 실험실 페이지 기능 초기화

    } catch (error) {
        console.error('Failed to initialize app:', error);
        updateAIMessage("시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.");
    }
}

// ===================================================================================
// NAVIGATION
// ===================================================================================

/**
 * 페이지 상단 네비게이션 링크와 '실험실 바로가기' 버튼의 클릭 이벤트를 설정합니다.
 * 클릭된 링크에 따라 해당 페이지를 보여주고 다른 페이지는 숨깁니다.
 */
function setupNavigation() {
    document.querySelectorAll('.nav-link, .interactive-button').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.target;
            
            // 모든 페이지를 일단 숨기고, 목표 페이지만 활성화
            document.querySelectorAll('.main-page, .lab-page').forEach(page => {
                page.classList.toggle('active', page.id === targetId);
                page.classList.toggle('hidden', page.id !== targetId);
            });
            
            // 네비게이션 링크의 활성 스타일 업데이트
            document.querySelectorAll('.nav-link').forEach(nav => {
                nav.classList.toggle('active', nav.dataset.target === targetId);
            });

            // 메인 페이지에서 가이드를 생성한 후 실험실로 이동할 경우, 생성된 색상 데이터를 전달
            if (targetId === 'lab-page' && appState.generatedResult) {
                const { bgColor, textColor } = appState.generatedResult;
                updateLabPageWithData(bgColor, textColor);
            }
        });
    });
}

// ===================================================================================
// MAIN PAGE LOGIC (AI 가이드 생성)
// ===================================================================================

/**
 * 메인 페이지의 기능들을 초기화합니다.
 * 드롭다운, 슬라이더, 생성 버튼의 이벤트를 설정하고 초기 AI 메시지를 출력합니다.
 */
function initializeMainPage() {
    initializeDropdowns();
    initializeSliders();
    document.getElementById('generate-btn').addEventListener('click', generateGuide);
    updateAIMessage("안녕하세요! TYPOUNIVERSE AI Design Assistant입니다. 어떤 프로젝트를 위한 디자인 가이드를 찾으시나요?");
}

/**
 * '서비스 목적'과 'OS/플랫폼' 드롭다운 메뉴를 초기화하고 클릭 이벤트를 설정합니다.
 */
function initializeDropdowns() {
    const services = ['포트폴리오', '브랜드 홍보', '제품 판매', '정보 전달', '학습', '엔터테인먼트'];
    const platforms = ['iOS', 'Android', 'Web', 'Desktop', 'Tablet', 'Wearable', 'VR'];
    
    populateDropdown('service', services);
    populateDropdown('platform', platforms);

    document.getElementById('service-dropdown').addEventListener('click', () => toggleDropdown('service'));
    document.getElementById('platform-dropdown').addEventListener('click', () => toggleDropdown('platform'));
}

/**
 * 드롭다운 메뉴의 옵션들을 동적으로 생성합니다.
 * @param {string} type - 'service' 또는 'platform'
 * @param {string[]} options - 메뉴에 표시될 옵션 배열
 */
function populateDropdown(type, options) {
    const menu = document.getElementById(`${type}-menu`);
    menu.innerHTML = '';
    options.forEach(optionText => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = optionText;
        option.onclick = () => selectOption(type, optionText);
        menu.appendChild(option);
    });
}

/**
 * 드롭다운 메뉴를 열고 닫는 토글 함수입니다.
 */
function toggleDropdown(type) {
    const menu = document.getElementById(`${type}-menu`);
    const otherMenuType = type === 'service' ? 'platform' : 'service';
    document.getElementById(`${otherMenuType}-menu`).classList.remove('show');
    menu.classList.toggle('show');
}

/**
 * 드롭다운 옵션 선택 시 호출되는 함수입니다.
 * 사용자의 선택을 appState에 저장하고, 다음 단계(Step 02)를 활성화합니다.
 */
function selectOption(type, value) {
    document.getElementById(`${type}-text`).textContent = value;
    document.getElementById(`${type}-dropdown`).classList.add('selected');
    appState[type] = value;
    toggleDropdown(type);

    // 두 드롭다운이 모두 선택되었을 때 다음 단계 표시
    if (appState.service && appState.platform) {
        document.getElementById('step02').classList.remove('hidden');
        updateAIMessage("훌륭해요! 이제 서비스의 핵심 분위기를 정해볼까요? 두 개의 슬라이더를 조절하여 원하는 무드를 찾아주세요.");
    }
}

/**
 * 서비스 무드를 조절하는 두 개의 슬라이더를 초기화합니다.
 * 슬라이더 값 변경 시 appState를 업데이트하고 키워드를 렌더링합니다.
 */
function initializeSliders() {
    const softHardSlider = document.getElementById('soft-hard-slider');
    const staticDynamicSlider = document.getElementById('static-dynamic-slider');
    
    const updateMoodAndKeywords = () => {
        appState.mood.soft = parseInt(softHardSlider.value);
        appState.mood.static = parseInt(staticDynamicSlider.value);
        
        // 슬라이더가 중앙값에서 일정 이상 벗어나면 다음 단계(Step 03) 활성화
        if (Math.abs(appState.mood.soft - 50) > 10 || Math.abs(appState.mood.static - 50) > 10) {
            document.getElementById('step03').classList.remove('hidden');
            renderKeywords();
        }
    };
    
    softHardSlider.addEventListener('input', updateMoodAndKeywords);
    staticDynamicSlider.addEventListener('input', updateMoodAndKeywords);
}

/**
 * 슬라이더 값에 따라 knowledgeBase에서 적절한 키워드 그룹을 찾아 화면에 표시합니다.
 */
function renderKeywords() {
    const { soft, static: staticMood } = appState.mood;
    // 슬라이더 위치에 따라 5개의 IRI 색상 그룹 중 하나를 선택
    let groupKey = (soft < 40 && staticMood >= 60) ? 'group1' :
                     (soft < 40 && staticMood < 40) ? 'group2' :
                     (soft >= 60 && staticMood < 40) ? 'group3' :
                     (soft >= 60 && staticMood >= 60) ? 'group4' : 'group5';
    
    const { keywords, description } = knowledgeBase.iri_colors[groupKey];
    const keywordContainer = document.getElementById('keyword-tags');
    keywordContainer.innerHTML = '';
    
    keywords.forEach(keyword => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.textContent = keyword;
        tag.onclick = () => selectKeyword(keyword, groupKey);
        keywordContainer.appendChild(tag);
    });
    updateAIMessage(`'${description}' 분위기를 선택하셨군요. 이와 관련된 키워드들을 제안합니다.`);
}

/**
 * 키워드 선택 시 호출됩니다.
 * 선택된 키워드에 맞는 대표 색상들을 표시하고, 'AI 가이드 생성' 버튼을 활성화할 준비를 합니다.
 */
function selectKeyword(keyword, groupKey) {
    appState.keyword = keyword;
    
    document.querySelectorAll('#keyword-tags .tag').forEach(tag => {
        tag.classList.toggle('selected', tag.textContent === keyword);
    });

    const { key_colors } = knowledgeBase.iri_colors[groupKey];
    const colorContainer = document.getElementById('color-selection');
    colorContainer.innerHTML = '';

    key_colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = color;
        swatch.onclick = () => selectColor(color);
        colorContainer.appendChild(swatch);
    });
    document.getElementById('color-selection-wrapper').style.display = 'block';
    updateAIMessage(`'${keyword}' 키워드에 어울리는 대표 색상들입니다. 마음에 드는 주조 색상을 선택해주세요.`);
}

/**
 * 주조 색상 선택 시 호출됩니다.
 * appState에 색상을 저장하고 'AI 가이드 생성' 버튼을 최종적으로 활성화합니다.
 */
function selectColor(color) {
    appState.primaryColor = color;
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('selected', swatch.style.backgroundColor.toLowerCase() === color.toLowerCase());
    });
    document.getElementById('generate-btn').classList.remove('hidden');
    updateAIMessage("좋습니다! 이제 버튼을 눌러 AI 디자인 가이드를 생성하세요.");
}

/**
 * 'AI 가이드 생성' 버튼 클릭 시 실행되는 핵심 함수입니다.
 * Netlify 서버리스 함수(/functions/generate-guide)에 appState와 knowledgeBase를 전송하고,
 * AI가 생성한 디자인 가이드 결과를 받아 화면에 표시합니다.
 * API 요청 실패 시에는 로컬에서 자체적으로 기본 가이드를 생성(fallback)합니다.
 */
async function generateGuide() {
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> AI 가이드 생성 중...';

    try {
        const response = await fetch('/.netlify/functions/generate-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                context: appState,
                knowledgeBase: knowledgeBase
            })
        });

        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        
        const data = await response.json();
        displayGeneratedGuide(data);

    } catch (error) {
        console.error('Error fetching AI guide:', error);
        const localData = generateLocalReport(); // API 실패 시 대체 로직
        displayGeneratedGuide(localData);
        updateAIMessage("⚠️ AI 서버 연결에 실패하여 기본 가이드를 생성했습니다.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'AI 가이드 생성하기';
        btn.classList.add('hidden');
    }
}

/**
 * Netlify 함수(AI) 호출 실패 시, 로컬에서 최소한의 디자인 가이드를 생성하는 함수입니다.
 */
function generateLocalReport() {
    const primary = appState.primaryColor;
    const secondary = getComplementaryColor(primary);
    const platformGuide = knowledgeBase.guidelines[appState.platform.toLowerCase()] || knowledgeBase.guidelines.web;

    return {
        colorSystem: {
            primary: { main: primary, light: lightenColor(primary, 20), dark: darkenColor(primary, 20) },
            secondary: { main: secondary, light: lightenColor(secondary, 20), dark: darkenColor(secondary, 20) }
        },
        typography: {
            bodySize: platformGuide.typeScale.body,
            headlineSize: platformGuide.typeScale.largeTitle || platformGuide.typeScale.headline,
            lineHeight: platformGuide.lineHeight
        },
        accessibility: {
            textColorOnPrimary: getContrastingTextColor(primary),
            contrastRatio: calculateContrast(primary, getContrastingTextColor(primary)).toFixed(2) + ':1'
        }
    };
}

/**
 * AI 또는 로컬에서 생성된 가이드 데이터를 받아 오른쪽 섹션에 시각적으로 표시합니다.
 */
function displayGeneratedGuide(data) {
    appState.generatedResult = {
        bgColor: data.colorSystem.primary.main,
        textColor: data.accessibility.textColorOnPrimary
    };

    // 컬러 시스템 표시
    for (const type of ['primary', 'secondary']) {
        for (const shade of ['main', 'light', 'dark']) {
            const element = document.getElementById(`${type}-${shade}`);
            const color = data.colorSystem[type][shade];
            element.style.background = color;
            element.querySelector('.color-code').textContent = color;
            element.style.color = getContrastingTextColor(color);
        }
    }
    
    // 타이포그래피 및 접근성 정보 표시
    const platformGuide = knowledgeBase.guidelines[appState.platform.toLowerCase()] || knowledgeBase.guidelines.web;
    document.getElementById('contrast-description').innerHTML = `Primary 색상을 배경으로 사용할 경우, WCAG AA 기준을 충족하는 텍스트 색상은 <strong>${data.accessibility.textColorOnPrimary}</strong> 이며, 대비는 <strong>${data.accessibility.contrastRatio}</strong>입니다.`;
    document.getElementById('font-size-description').innerHTML = `<p><strong>(제목)</strong> ${platformGuide.typeScale.largeTitle || platformGuide.typeScale.headline} / <strong>(본문)</strong> ${platformGuide.typeScale.body}</p><p style="font-size: 13px; color: #555;">${platformGuide.description}</p>`;

    document.getElementById('ai-report').style.display = 'block';
    document.getElementById('guidelines').style.display = 'grid';
    updateAIMessage(`${appState.platform} 플랫폼에 최적화된 디자인 가이드가 생성되었습니다!`);
}


// ===================================================================================
// LAB PAGE LOGIC (인터랙티브 실험실)
// ===================================================================================

/**
 * 실험실 페이지의 모든 인터랙티브 요소(색상, 슬라이더)를 초기화합니다.
 */
function initializeLabPage() {
    const inputs = ['bg-color-input', 'text-color-input', 'line-height-input', 'font-size-input'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateLab);
    });
    
    document.getElementById('bg-color-picker').addEventListener('input', (e) => {
        document.getElementById('bg-color-input').value = e.target.value;
        updateLab();
    });
    document.getElementById('text-color-picker').addEventListener('input', (e) => {
        document.getElementById('text-color-input').value = e.target.value;
        updateLab();
    });

    updateLab(); // 초기 로딩 시 한 번 실행하여 기본값으로 화면 구성
}

/**
 * 실험실의 입력값이 변경될 때마다 호출되어 화면 전체를 실시간으로 업데이트합니다.
 */
function updateLab() {
    const bgColor = document.getElementById('bg-color-input').value;
    const textColor = document.getElementById('text-color-input').value;
    const lineHeight = document.getElementById('line-height-input').value;
    
    // 명도 대비 계산 및 표시
    const ratio = calculateContrast(bgColor, textColor);
    document.getElementById('contrast-ratio').textContent = ratio.toFixed(2) + ' : 1';
    
    // WCAG AA, AAA 등급 통과 여부 표시
    const aaPass = ratio >= 4.5;
    const aaaPass = ratio >= 7;
    document.getElementById('aa-status').classList.toggle('pass', aaPass);
    document.getElementById('aa-status').classList.toggle('fail', !aaPass);
    document.getElementById('aaa-status').classList.toggle('pass', aaaPass);
    document.getElementById('aaa-status').classList.toggle('fail', !aaaPass);

    // 미리보기 텍스트 스타일 업데이트
    const preview = document.getElementById('text-preview');
    preview.style.backgroundColor = bgColor;
    preview.style.color = textColor;
    preview.style.lineHeight = lineHeight;
    document.getElementById('line-height-value').textContent = lineHeight;

    // 폰트 단위 변환기 업데이트
    const fontSize = document.getElementById('font-size-input').value || 16;
    document.getElementById('pt-example').textContent = (fontSize * 0.75).toFixed(1) + 'pt';
    document.getElementById('rem-example').textContent = (fontSize / 16).toFixed(2) + 'rem';
    document.getElementById('sp-example').textContent = fontSize + 'sp';

    // 색약자 시뮬레이터 업데이트
    updateSimulator(bgColor, textColor);
}

/**
 * 색약자 시뮬레이터와 AI 접근성 솔루션 섹션을 업데이트하는 핵심 함수입니다.
 * @param {string} bgColor - 사용자가 입력한 배경색 (주조색상)
 * @param {string} textColor - 사용자가 입력한 텍스트색 (보조색상)
 */
function updateSimulator(bgColor, textColor) {
    // 1. 색상 변환: 입력된 색상을 적록색약 시뮬레이션 색상으로 변환
    const simBg = daltonizeColor(bgColor);
    const simText = daltonizeColor(textColor);

    // 2. 팔레트 업데이트: 일반/적록색약 시각의 주조/보조 색상 박스를 업데이트
    updatePaletteItem(document.getElementById('origBg'), bgColor, "주조색상");
    updatePaletteItem(document.getElementById('origText'), textColor, "보조색상");
    updatePaletteItem(document.getElementById('simBg'), simBg, "주조색상");
    updatePaletteItem(document.getElementById('simText'), simText, "보조색상");

    // 3. 명도 대비 계산
    const origRatio = calculateContrast(bgColor, textColor);
    const simRatio = calculateContrast(simBg, simText);
    
    // 4. AI 접근성 솔루션 텍스트 생성
    const getStatusText = (ratio, type) => {
        let grade = (ratio >= 7) ? 'AAA등급 충족' : (ratio >= 4.5) ? 'AA등급 충족' : '기준 미달';
        return (ratio >= 4.5) ?
            `<p style="color:#2e7d32;">✅ 양호: ${type}, 명도대비율 <strong>${ratio.toFixed(2)}:1</strong>, ${grade}입니다.</p>` :
            `<p style="color:#d32f2f;">⚠️ 주의: ${type}, 명도대비율 <strong>${ratio.toFixed(2)}:1</strong>로 낮아져 구분이 어려울 수 있습니다.</p>`;
    };
    let solutionHTML = getStatusText(origRatio, '일반 시각') + getStatusText(simRatio, '적록색약 시각');
    if (simRatio < 4.5) {
        solutionHTML += `<p style="margin-top:10px; font-size: 14px;">명도 차이를 더 확보하거나, 색상 외 다른 시각적 단서(아이콘, 굵기 등) 사용을 권장합니다.</p>`;
    }
    document.getElementById('solution-text').innerHTML = solutionHTML;

    // 5. 명도 대비 예시 박스 업데이트
    const origExampleBox = document.getElementById('orig-contrast-example');
    let origExampleGrade = (origRatio >= 7) ? ' AAA' : (origRatio >= 4.5) ? ' AA' : '';
    origExampleBox.style.backgroundColor = bgColor;
    origExampleBox.style.color = textColor;
    origExampleBox.querySelector('.ratio-display').textContent = `${origRatio.toFixed(2)}:1${origExampleGrade}`;

    const simExampleBox = document.getElementById('sim-contrast-example');
    simExampleBox.style.backgroundColor = simBg;
    simExampleBox.style.color = simText;
    simExampleBox.querySelector('.ratio-display').textContent = `${simRatio.toFixed(2)}:1`;
}

/**
 * 시뮬레이터의 각 색상 박스 스타일과 텍스트를 업데이트합니다.
 * @param {HTMLElement} element - 업데이트할 DOM 요소
 * @param {string} color - 적용할 색상
 * @param {string} label - 표시할 라벨 ('주조색상' 또는 '보조색상')
 */
function updatePaletteItem(element, color, label) {
    element.style.background = color;
    element.querySelector('.hex-code-sim').textContent = color;
    element.querySelector('.palette-label').textContent = label;
    element.style.color = getContrastingTextColor(color);
}

/**
 * 메인 페이지에서 생성한 가이드 색상을 실험실 페이지로 전달하여 적용합니다.
 */
function updateLabPageWithData(bgColor, textColor) {
    document.getElementById('bg-color-input').value = bgColor;
    document.getElementById('text-color-input').value = textColor;
    updateLab();
}

/**
 * AI Assistant 메시지를 타이핑 효과와 함께 표시합니다.
 */
function updateAIMessage(message) {
    const el = document.getElementById('ai-message');
    clearTimeout(typingTimeout);
    let i = 0;
    el.innerHTML = '';
    function typeWriter() {
        if (i < message.length) {
            el.innerHTML = message.substring(0, i + 1) + '<span class="typing-cursor">|</span>';
            i++;
            typingTimeout = setTimeout(typeWriter, 25);
        } else {
            el.querySelector('.typing-cursor')?.remove();
        }
    }
    typeWriter();
}

// ===================================================================================
// Helper Functions (보조 함수)
// ===================================================================================

/** 배경색에 따라 대조되는 텍스트 색상(검정/흰색)을 반환합니다. */
function getContrastingTextColor(hex) {
    if (!hex || hex.length < 4) return '#000000';
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/** 두 색상 간의 명도 대비율을 WCAG 기준에 따라 계산합니다. */
function calculateContrast(hex1, hex2) {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

/** 색상의 휘도(luminance)를 계산합니다. */
function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const [r, g, b] = Object.values(rgb).map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** HEX 코드를 RGB 객체로 변환합니다. */
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const bigint = parseInt(hex, 16);
    if (isNaN(bigint)) return null;
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

/** 일반 색상을 적록색약 시뮬레이션 색상으로 변환(Daltonize)합니다. */
function daltonizeColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    const { r, g, b } = rgb;
    const simR = 0.567 * r + 0.433 * g;
    const simG = 0.558 * r + 0.442 * g;
    const simB = 0.242 * g + 0.758 * b;
    const toHex = c => ('0' + Math.round(Math.min(255, c)).toString(16)).slice(-2);
    return `#${toHex(simR)}${toHex(simG)}${toHex(simB)}`;
}

/** 색상을 밝게 만듭니다. */
function lightenColor(color, percent) {
    const num = parseInt(color.slice(1), 16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

/** 색상을 어둡게 만듭니다. */
function darkenColor(color, percent) {
    const num = parseInt(color.slice(1), 16), amt = Math.round(2.55 * percent), R = (num >> 16) - amt, G = (num >> 8 & 0x00FF) - amt, B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

/** 보색(complementary color)을 계산합니다. */
function getComplementaryColor(hex){
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max == min) { h = s = 0; }
    else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    h = (h + 0.5) % 1;
    let r1, g1, b1;
    if (s == 0) { r1 = g1 = b1 = l; }
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r1 = hue2rgb(p, q, h + 1/3);
        g1 = hue2rgb(p, q, h);
        b1 = hue2rgb(p, q, h - 1/3);
    }
    const toHex = x => ('0' + Math.round(x * 255).toString(16)).slice(-2);
    return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}