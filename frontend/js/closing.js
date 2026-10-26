/* ============================================================
   结语页 · 三叶修图
   - 进场那层「雾」由 CSS 动画负责（见 closing.css 的 .fog）
   - 这里把这句话拆成一个一个 <span>，错峰浮现（字字显示）
   延迟 = 基础 950ms（等雾基本散开）+ 每个字 26ms 错峰
   ============================================================ */

const TEXT = '人生是一场很长的旅行，开始的时候你会做加法，把越来越多的东西背在身上，后来你会做减法，减到最后，剩下的那唯一的一件东西就是最重要的。';

const el = document.getElementById('quoteText');

if (el) {
    const frag = document.createDocumentFragment();
    [...TEXT].forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'c';
        s.textContent = ch;
        s.style.setProperty('--d', `${950 + i * 26}ms`);
        frag.appendChild(s);
    });
    el.appendChild(frag);
    el.classList.add('run');
}
