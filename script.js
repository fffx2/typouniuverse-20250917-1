// ===================================================================================
// INITIALIZATION & GLOBAL STATE
// ===================================================================================

let appState = {
    service: '', platform: '',
    mood: { soft: 50, static: 50 },
    keyword: '', primaryColor: '',
    generatedResult: null
};
let knowledgeBase = {};
let typingTimeout;

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        const response = await fetch('./knowledge_base.json');
        if (!response.ok) throw new Error('Network response was not ok');
        knowledgeBase = await response.json();
        
        setupNavigation();
        initializeMainPage();
        initializeLabPage();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        updateAIMessage("시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.");
    }
}

// ===================================================================================
// NAVIGATION - 페이지 간 전환 기능
// ===================================================================================

function setupNavigation() {
    document.querySelectorAll('.nav-link, .interactive-button').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.target;
            
            document.querySelectorAll('.main-page, .lab-page').forEach(page => {
                page.classList.toggle('active', page.id === targetId);
                page.classList.toggle('hidden', page.id !== targetId);
            });
            
            document.querySelectorAll('.nav-link').forEach(nav => {
                nav.classList.toggle('active', nav.dataset.target === targetId);
            });

            if (targetId === 'lab-page' && appState.generatedResult) {
                const { bgColor, textColor } = appState.generatedResult;
                updateLabPageWithData(bgColor, textColor);
            }
        });
    });
}

// ===================================================================================
// MAIN PAGE LOGIC - 메인 페이지 기능들
// ===================================================================================

function initializeMainPage() {
    initializeDropdowns();
    initializeSliders();
    document.getElementById('generate-btn').addEventListener('click', generateGuide);
    updateAIMessage("안녕하세요! TYPOUNIVERSE AI Design Assistant입니다. 어떤 프로젝트를 위한 디자인 가이드를 찾으시나요?");
}

// 드롭다운 초기화 및 옵션 설정
function initializeDropdowns() {
    const services = ['포트폴리오', '브랜드 홍보', '제품 판매', '정보 전달', '학습', '엔터테인먼트'];
    const platforms = ['iOS', 'Android', 'Web', 'Desktop', 'Tablet', 'Wearable', 'VR'];
    
    populateDropdown('service', services);
    populateDropdown('platform', platforms);

    document.getElementById('service-dropdown').addEventListener('click', () => toggleDropdown('service'));
    document.getElementById('platform-dropdown').addEventListener('click', () => toggleDropdown('platform'));
}

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

function toggleDropdown(type) {
    const menu = document.getElementById(`${type}-menu`);
    const otherMenuType = type === 'service' ? 'platform' : 'service';
    document.getElementById(`${otherMenuType}-menu`).classList.remove('show');
    menu.classList.toggle('show');
}

// 드롭다운 옵션 선택 시 처리
function selectOption(type, value) {
    document.getElementById(`${type}-text`).textContent = value;
    document.getElementById(`${type}-dropdown`).classList.add('selected');
    appState[type] = value;
    toggleDropdown(type);

    if (appState.service && appState.platform) {
        document.getElementById('step02').classList.remove('hidden');
        updateAIMessage("훌륭해요! 이제 서비스의 핵심 분위기를 정해볼까요? 두 개의 슬라이더를 조절하여 원하는 무드를 찾아주세요.");
    }
}

// 무드 슬라이더 초기화
function initializeSliders() {
    const softHardSlider = document.getElementById('soft-hard-slider');
    const staticDynamicSlider = document.getElementById('static-dynamic-slider');
    
    const updateMoodAndKeywords = () => {
        appState.mood.soft = parseInt(softHardSlider.value);
        appState.mood.static = parseInt(staticDynamicSlider.value);
        
        if (Math.abs(appState.mood.soft - 50) > 10 || Math.abs(appState.mood.static - 50) > 10) {
            document.getElementById('step03').classList.remove('hidden');
            renderKeywords();
        }
    };
    
    softHardSlider.addEventListener('input', updateMoodAndKeywords);
    staticDynamicSlider.addEventListener('input', updateMoodAndKeywords);
}

// 무드에 따른 키워드 렌더링
function renderKeywords() {
    const { soft, static: staticMood } = appState.mood;
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

// 키워드 선택 시 색상 팔레트 표시
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

function selectColor(color) {
    appState.primaryColor = color;
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('selected', swatch.style.backgroundColor.toLowerCase() === color.toLowerCase());
    });
    document.getElementById('generate-btn').classList.remove('hidden');
    updateAIMessage("좋습니다! 이제 버튼을 눌러 AI 디자인 가이드를 생성하세요.");
}

// AI 가이드 생성 (API 호출 또는 로컬 생성)
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
        const localData = generateLocalReport();
        displayGeneratedGuide(localData);
        updateAIMessage("⚠️ AI 서버 연결에 실패하여 기본 가이드를 생성했습니다.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'AI 가이드 생성하기';
        btn.classList.add('hidden');
    }
}

// 로컬 보고서 생성 (API 실패 시 대체)
function generateLocalReport() {
    const primary = appState.primaryColor;
    const primaryLight = lightenColor(primary, 20);
    const primaryDark = darkenColor(primary, 20);
    const secondary = getComplementaryColor(primary);
    const secondaryLight = lightenColor(secondary, 20);
    const secondaryDark = darkenColor(secondary, 20);
    const platformGuide = knowledgeBase.guidelines[appState.platform.toLowerCase()] || knowledgeBase.guidelines.web;

    return {
        colorSystem: {
            primary: { main: primary, light: primaryLight, dark: primaryDark },
            secondary: { main: secondary, light: secondaryLight, dark: secondaryDark }
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

// 생성된 가이드 화면에 표시
function displayGeneratedGuide(data) {
    appState.generatedResult = {
        bgColor: data.colorSystem.primary.main,
        textColor: data.accessibility.textColorOnPrimary
    };

    // 색상 시스템 표시
    for (const type of ['primary', 'secondary']) {
        for (const shade of ['main', 'light', 'dark']) {
            const element = document.getElementById(`${type}-${shade}`);
            const color = data.colorSystem[type][shade];
            element.style.background = color;
            element.querySelector('.color-code').textContent = color;
            element.style.color = getContrastingTextColor(color);
        }
    }

    const platformKey = appState.platform.toLowerCase();
    const platformGuide = knowledgeBase.guidelines[platformKey] || knowledgeBase.guidelines.web;
    
    document.getElementById('contrast-description').innerHTML = `Primary 색상 배경 사용 시, 권장 텍스트 색상은 <strong>${data.accessibility.textColorOnPrimary}</strong>이며, 대비는 <strong>${data.accessibility.contrastRatio}</strong>입니다.`;
    
    const typographyHTML = `
        <p style="margin-bottom: 8px;"><strong>권장 크기:</strong> ${data.typography.bodySize} (본문) / ${data.typography.headlineSize} (제목)</p>
        <p style="margin-bottom: 8px;"><strong>출처:</strong> ${platformGuide.source}</p>
        <p style="font-size: 12px; color: #666;"><strong>설명:</strong> ${platformGuide.description}</p>
    `;
    document.getElementById('font-size-description').innerHTML = typographyHTML;

    document.getElementById('ai-report').style.display = 'block';
    document.getElementById('guidelines').style.display = 'grid';
    updateAIMessage(`${appState.platform} 플랫폼에 최적화된 디자인 가이드가 생성되었습니다!`);
}

// ===================================================================================
// LAB PAGE LOGIC - 실험실 페이지 기능들
// ===================================================================================

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

    updateLab();
}

// 실험실 페이지 실시간 업데이트
function updateLab() {
    const bgColor = document.getElementById('bg-color-input').value;
    const textColor = document.getElementById('text-color-input').value;
    const lineHeight = document.getElementById('line-height-input').value;
    
    // 컬러 피커 동기화
    document.getElementById('bg-color-picker').value = bgColor;
    document.getElementById('text-color-picker').value = textColor;
    
    // 명도대비 계산 및 표시
    const ratio = calculateContrast(bgColor, textColor);
    document.getElementById('contrast-ratio').textContent = ratio.toFixed(2) + ' : 1';
    
    // WCAG 기준 평가
    const aaPass = ratio >= 4.5;
    const aaaPass = ratio >= 7;

    document.getElementById('aa-status').classList.toggle('pass', aaPass);
    document.getElementById('aa-status').classList.toggle('fail', !aaPass);
    document.getElementById('aaa-status').classList.toggle('pass', aaaPass);
    document.getElementById('aaa-status').classList.toggle('fail', !aaaPass);

    const infoEl = document.getElementById('contrast-info');
    infoEl.classList.toggle('pass', aaPass);
    infoEl.classList.toggle('fail', !aaPass);
    
    // 텍스트 미리보기 업데이트
    const preview = document.getElementById('text-preview');
    preview.style.backgroundColor = bgColor;
    preview.style.color = textColor;
    preview.style.lineHeight = lineHeight;
    document.getElementById('line-height-value').textContent = lineHeight;

    // 폰트 단위 변환
    const fontSize = document.getElementById('font-size-input').value || 16;
    document.getElementById('pt-example').textContent = (fontSize * 0.75).toFixed(1) + 'pt';
    document.getElementById('rem-example').textContent = (fontSize / 16).toFixed(2) + 'rem';
    document.getElementById('sp-example').textContent = fontSize + 'sp';

    // 색약 시뮬레이션 업데이트
    updateColorblindSimulator(bgColor, textColor);
}

// 색약 시뮬레이션 업데이트 (새로운 레이아웃 적용)
function updateColorblindSimulator(bgColor, textColor) {
    // 일반 시각 색상 설정
    const normalPrimary = document.getElementById('normal-primary');
    const normalSecondary = document.getElementById('normal-secondary');
    if (normalPrimary && normalSecondary) {
        normalPrimary.style.backgroundColor = bgColor;
        document.getElementById('normal-primary-hex').textContent = bgColor;
        
        normalSecondary.style.backgroundColor = textColor;
        document.getElementById('normal-secondary-hex').textContent = textColor;
    }
    
    // 일반 시각 데모 박스
    const normalDemo = document.getElementById('normal-demo');
    if (normalDemo) {
        normalDemo.style.backgroundColor = bgColor;
        normalDemo.style.color = textColor;
        const normalRatio = calculateContrast(bgColor, textColor);
        const normalRatioText = normalRatio >= 4.5 ? `${normalRatio.toFixed(2)}:1 AA` : `${normalRatio.toFixed(2)}:1`;
        document.getElementById('normal-ratio').textContent = normalRatioText;
    }
    
    // 색약 변환
    const simBg = daltonizeColor(bgColor);
    const simText = daltonizeColor(textColor);
    
    // 색약 시각 색상 설정
    const simPrimary = document.getElementById('sim-primary');
    const simSecondary = document.getElementById('sim-secondary');
    if (simPrimary && simSecondary) {
        simPrimary.style.backgroundColor = simBg;
        document.getElementById('sim-primary-hex').textContent = simBg;
        
        simSecondary.style.backgroundColor = simText;
        document.getElementById('sim-secondary-hex').textContent = simText;
    }
    
    // 색약 시각 데모 박스
    const simDemo = document.getElementById('sim-demo');
    if (simDemo) {
        simDemo.style.backgroundColor = simBg;
        simDemo.style.color = simText;
        const simRatio = calculateContrast(simBg, simText);
        const simRatioText = simRatio >= 4.5 ? `${simRatio.toFixed(2)}:1 AA` : `${simRatio.toFixed(2)}:1`;
        document.getElementById('sim-ratio').textContent = simRatioText;
    }
    
    // AI 접근성 솔루션 텍스트 업데이트
    updateAccessibilitySolution(bgColor, textColor, simBg, simText);
}

// AI 접근성 솔루션 메시지 업데이트
function updateAccessibilitySolution(bgColor, textColor, simBg, simText) {
    const normalRatio = calculateContrast(bgColor, textColor);
    const simRatio = calculateContrast(simBg, simText);
    
    const solutionText = document.getElementById('solution-text');
    if (!solutionText) return;
    
    let html = '';
    
    // 일반 시각 평가
    if (normalRatio >= 4.5) {
        html += `<span class="solution-status">✅ 양호: </span>`;
        html += `<span class="solution-message">일반 시각, 명도대비율 ${normalRatio.toFixed(2)}:1, AA등급 충족입니다.</span><br>`;
    } else {
        html += `<span class="solution-status warning">⚠️ 주의: </span>`;
        html += `<span class="solution-message">일반 시각, 명도대비율 ${normalRatio.toFixed(2)}:1로 WCAG 기준 미달입니다.</span><br>`;
    }
    
    // 색약 시각 평가
    if (simRatio >= 4.5) {
        html += `<span class="solution-status">✅ 양호: </span>`;
        html += `<span class="solution-message">적록색약 시각에서도 ${simRatio.toFixed(2)}:1로 충분한 대비를 유지합니다.</span>`;
    } else {
        html += `<span class="solution-status warning">⚠️ 주의: </span>`;
        html += `<span class="solution-message">적록색약 시각, 명도대비율 ${simRatio.toFixed(2)}:1로 낮아서 구분이 어려울 수 있습니다.</span>`;
    }
    
    solutionText.innerHTML = html;
    
    // 추가 권장사항
    const footer = document.querySelector('.solution-footer');
    if (footer && simRatio < 4.5) {
        footer.style.display = 'block';
    } else if (footer) {
        footer.style.display = 'none';
    }
}

// 메인 페이지에서 생성된 색상 데이터를 실험실로 전달
function updateLabPageWithData(bgColor, textColor) {
    document.getElementById('bg-color-input').value = bgColor;
    document.getElementById('text-color-input').value = textColor;
    updateLab();
}

// AI 메시지 타이핑 애니메이션
function updateAIMessage(message) {
    const el = document.getElementById('ai-message');
    clearTimeout(typingTimeout);
    let i = 0;
    el.innerHTML = '';
    function typeWriter() {
        if (i < message.length) {
            if (el.querySelector('.typing-cursor')) {
                el.querySelector('.typing-cursor').remove();
            }
            el.innerHTML = message.substring(0, i + 1) + '<span class="typing-cursor">|</span>';
            i++;
            typingTimeout = setTimeout(typeWriter, 25);
        } else {
            if (el.querySelector('.typing-cursor')) {
                el.querySelector('.typing-cursor').remove();
            }
        }
    }
    typeWriter();
}

// ===================================================================================
// HELPER FUNCTIONS - 유틸리티 함수들
// ===================================================================================

// 배경색에 대해 최적의 텍스트 색상 (검정/흰색) 반환
function getContrastingTextColor(hex) {
    if (!hex || hex.length < 4) return '#000000';
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// WCAG 명도대비 계산
function calculateContrast(hex1, hex2) {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

// 색상의 상대 휘도 계산
function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const [r, g, b] = Object.values(rgb).map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// HEX를 RGB로 변환
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const bigint = parseInt(hex, 16);
    if (isNaN(bigint)) return null;
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

// 적록색약 시뮬레이션 (Protanomaly/Deuteranomaly)
function daltonizeColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    const r = rgb.r, g = rgb.g, b = rgb.b;
    // 적록색약 변환 매트릭스 적용
    const simR = 0.567 * r + 0.433 * g;
    const simG = 0.558 * r + 0.442 * g;
    const simB = 0.242 * g + 0.758 * b;
    const toHex = c => ('0' + Math.round(Math.min(255, c)).toString(16)).slice(-2);
    return `#${toHex(simR)}${toHex(simG)}${toHex(simB)}`;
}

// 색상을 밝게 만들기
function lightenColor(color, percent) {
    const num = parseInt(color.slice(1), 16), amt = Math.round(2.55 * percent), 
          R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

// 색상을 어둡게 만들기
function darkenColor(color, percent) {
    const num = parseInt(color.slice(1), 16), amt = Math.round(2.55 * percent), 
          R = (num >> 16) - amt, G = (num >> 8 & 0x00FF) - amt, B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

// 보색 계산 (HSL 색 공간 활용)
function getComplementaryColor(hex){
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max == min) { 
        h = s = 0; 
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    // 보색 계산 (색상 값에 0.5 더하기)
    h = (h + 0.5) % 1;
    
    // HSL을 RGB로 변환
    let r1, g1, b1;
    if (s == 0) { 
        r1 = g1 = b1 = l; 
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; 
            if (t > 1) t -= 1;
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