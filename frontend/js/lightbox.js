/* ============================================================
   灯箱的摆位数学（首页和地图页共用）

   首页那个灯箱是 FLIP 飞过去的，地图页只淡入 —— 但两边的图必须落到
   同一个位置，而 .lb__img 在 gallery.css 里只有 position: absolute，
   既没有 inset 也没有宽高，位置全靠这几个函数算出来写进 style。
   与其抄两份（抄一遍一定会漂），不如放这儿。

   这里只放纯计算和纯赋值，不碰任何页面状态：原图多大由调用方喂进来。
   ============================================================ */

/**
 * 按原图比例塞进视口，四周留白，顶部多留一点、底部留出说明文字的位置。
 * @returns {{left:number, top:number, w:number, h:number}} 视口坐标，px
 */
export function fitBox(nw, nh) {
    const padX = innerWidth < 620 ? 24 : 96;
    const padTop = 64;
    const padBottom = 118;
    const maxW = Math.max(80, innerWidth - padX * 2);
    const maxH = Math.max(80, innerHeight - padTop - padBottom);

    const s = Math.min(maxW / nw, maxH / nh);

    return {
        left: (innerWidth - nw * s) / 2,
        top: padTop + (maxH - nh * s) / 2,
        w: nw * s,
        h: nh * s,
    };
}

export function placeImage(el, box) {
    el.style.left = box.left + 'px';
    el.style.top = box.top + 'px';
    el.style.width = box.w + 'px';
    el.style.height = box.h + 'px';
}

/** 说明文字跟在图下面 18px，图换位置时它要跟着走 */
export function placeCaption(el, box) {
    el.style.top = (box.top + box.h + 18) + 'px';
}
