// ==UserScript==
// @name         京东淘宝比价，淘宝内部优惠券获取，省钱神器
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       You
// @require      https://cdn.bootcss.com/jquery/2.2.4/jquery.min.js
// @include      http*://item.jd.com/*
// @include      http*://detail.tmall.com/item.htm*
// @include      http*://item.taobao.com/item.htm*
// @grant        GM_xmlhttpRequest
// @connect     www.chenzelin.ml
// @copyright 2018, chenzelin (https://openuserjs.org/users/chenzelin)
// @license MIT
// ==/UserScript==
host = 'www.chenzelin.ml:8870';
//返回插件card_node
function jd_card(title, price, pic_url, item_url, coupon_url, coupon_info){
    var div = document.createElement('li');
    div.style="width: 80%; margin: 5px; border-bottom: black";
    var a = document.createElement('a');
    a.target="_blank";
    div.appendChild(a);
    a.href=item_url;
    a.style="font-weight: bold; padding: 5px; text-decoration: none";
    var b=document.createElement('b');
    var img = document.createElement('img');
    a.appendChild(img);
    img.style="width: 100%;height: 100%; padding: 5px;";
    img.title=title;
    img.alt=title;
    img.src=pic_url;

    var btn = document.createElement('a');
    div.appendChild(btn);
    btn.className="btn-special1 btn";
    btn.style="padding: 5px; width: 100%; font-weight: bold";
    btn.href=coupon_url;
    btn.target="_blank";
    var idx = coupon_info.indexOf('减');
    coupon_info = coupon_info.substring(idx, coupon_info.length);
    coupon_info = coupon_info.replace("元", '');
    var iTxt;
    if(coupon_info != '无'){
        iTxt = "￥" + price + " | 券:" + coupon_info;
    }else{
        iTxt = '￥' + price;
    }
    btn.innerText=iTxt;
    return div;
}

function tb_card(title, price, pic_url, item_url, coupon_url, coupon_info){
    var li = document.createElement('li');
    var div = document.createElement('div');
    li.appendChild(div);
    div.className = 'img';
    div.style="width: 80%; margin: 5px; border-bottom: black";
    var a = document.createElement('a');
    a.target="_blank";
    div.appendChild(a);
    a.href=item_url;
    var img = document.createElement('img');
    a.appendChild(img);
    img.style="width: 100%;height: 100%; padding: 5px;";
    img.title=title;
    img.alt=title;
    img.src=pic_url;

    var b = document.createElement('span');
    div.appendChild(b);
    b.style="padding: 5px; width: 100%; font-weight: bold; color: red; display: flex; justify-content: center";
    var idx = coupon_info.indexOf('减');
    coupon_info = coupon_info.substring(idx, coupon_info.length);
    coupon_info = coupon_info.replace("元", '');
    var iTxt;
    if(coupon_info != 'NULL'){
        iTxt = price + " | 券:" + coupon_info;
    }else{
        iTxt = price;
    }
    b.innerText=iTxt;
    return li;
}

function plugClick(){
    if(ul.style.display == 'none'){
        ul.style.display='block';
    }
    else {
        ul.style.display='none';
    }
}

function jd_change_btn_style(btn_obj, sty){
    if(sty == 'finding'){
        btn_obj.className="btn-special2 btn-lg";
        btn_obj.innerText="查找中...";
        btn_obj.disabled=true;
    }
    if(sty == 'found'){
        btn_obj.className="btn-special1 btn-lg";
        btn_obj.innerText="查优惠";
        btn_obj.disabled=false;
    }
    if(sty == 'notFound'){
        btn_obj.className="button button01";
        btn_obj.innerText="未找到同类商品";
        btn_obj.disabled=true;
    }
}

function tb_change_btn_style(btn_obj, sty){
    if(sty == 'finding'){
        btn_obj.className="tb-btn-buy tb-btn-sku";
        btn_obj.innerText="查找中...";
        btn_obj.disabled=true;
    }
    if(sty == 'found'){
        btn_obj.className="tb-btn-basket tb-btn-sku";
        btn_obj.innerText="查优惠";
        btn_obj.disabled=false;
    }
    if(sty == 'notFound'){
        btn_obj.className="button";
        btn_obj.innerText="未找到同类商品";
        btn_obj.disabled=true;
    }
}

function jd_toggle(){
    var btn = document.createElement('button');
    jd_change_btn_style(btn, 'finding');
    btn.onclick=plugClick;
    return btn;
}

function tb_toggle(){
    var btn = document.createElement('button');
    tb_change_btn_style(btn, 'finding');
    btn.onclick=plugClick;
    return btn;
}

function jd_get_title(){
    var item = document.querySelector("div.crumb.fl.clearfix > div:nth-child(5) > a").innerText;
    var brand = document.querySelector('div.crumb.fl.clearfix > div:nth-child(7) > a');
    if(brand === null){
        brand = document.querySelector('div.head > a');
    }
    if(brand === null){
        brand = '';
    }else{
        brand = brand.innerText;
    }

    var s_url = document.location.href;
    var idx = s_url.indexOf('html');
    s_url = s_url.substring(0, idx + 4);
    var ret = {
        item: item,
        brand: brand,
        s_url: s_url
    };
    return ret;
}

function tb_get_title(){
    return document.getElementsByName('keywords')[0].content;
}

function load_gwd(hack_obj, btn_obj, s_url, title, brand, failed_callback){
    GM_xmlhttpRequest({
        method: "GET", responseType: 'jsonp',
        url: "http://" + host + "/api/tb/s?k=" + title + "&b=" + brand + '&u=' + s_url,
        onload: function(resp) {
            try{
                var items = $.parseJSON(resp.responseText);
                if(items.length === 0 || typeof(items) == "string"){
                    // 淘宝alimam接口查询同类商品，毕竟gwd的接口太不稳定了
                    failed_callback(hack_obj, btn_obj, s_url, title, brand);
                }else{
                    jd_change_btn_style(btn_obj, 'found');
                    for(var i=0;i<items.length;i++){
                        item = items[i];
                        var pic_url = item.pic_url;
                        var item_link = item.item_link;
                        var coupon_url = item.item_coupon;
                        var coupon_info = item.coupon_info;
                        if(coupon_info == 'NULL') {
                            coupon_info = '无';
                            coupon_url = item_link;
                        }

                        var price = item.price;
                        var item_title = item.title;
                        var i_node = jd_card(item_title, price, pic_url, item_link, coupon_url, coupon_info);
                        hack_obj.appendChild(i_node);
                    }
                }
            }catch(e){
                failed_callback(hack_obj, btn_obj, s_url, title, brand);
            }
        }
    });
}

function load_tb(hack_obj, btn_obj, s_url, title, brand){
    GM_xmlhttpRequest({
        method: "GET", responseType: 'jsonp',
        url: "http://" + host + "/api/tb/s?k=" + title,
        onload: function(resp) {
            try{
                var items = $.parseJSON(resp.responseText);
                if(items.length === 0){
                    // 淘宝alimam接口查询同类商品，先hold着，毕竟gwd的接口太不稳定了
                    jd_change_btn_style(btn_obj, 'notFound');
                }else{
                    jd_change_btn_style(btn_obj, 'found');
                    for(var i=0;i<items.length;i++){
                        item = items[i];
                        var pic_url = item.pic_url;
                        var item_link = item.item_link;
                        var coupon_url = item.item_coupon;
                        var coupon_info = item.coupon_info;
                        if(coupon_info == 'NULL') {
                            coupon_info='无';
                            coupon_url = item_link;
                        }
                        var price = item.price;
                        var item_title = item.title;
                        var i_node = jd_card(item_title, price, pic_url, item_link, coupon_url, coupon_info);
                        hack_obj.appendChild(i_node);
                    }
                }
            }catch(e) {
                jd_change_btn_style(btn_obj, 'notFound');
            }
        }
    });
}

function jd_load(s_url, title, brand){
    var hack = document.querySelector("#track > div.extra > div.track-tit");
    ul=document.createElement('ul');
    ul.style.display='none';
    var btn = jd_toggle();
    var dv = document.createElement('div');
    dv.style += 'zIndex: 9999';
    dv.appendChild(btn);
    dv.appendChild(ul);
    hack.insertBefore(dv, hack.children[1]);
    load_gwd(ul, btn, s_url, title, brand, load_tb);
}

function AutoStart(time, cssSelector, dealFunc) {
    var timerNode = setInterval(function () {
        try{
            if (document.querySelector(cssSelector).style.display == "") {
                clearInterval(timerNode);
                dealFunc();
            }
        }catch (e){}
    }, time);
}

function tb_load(title){
    var query = 'http://' + host  + '/query?q='+ encodeURI(title);
    var faNode = document.querySelector("div#J_Title p.tb-subtitle, div.tb-detail-hd h1");
    var insNode = document.createElement("div");
    insNode.style = "font-size: 20px;font-weight: bold;font-family:microsoft yahei;";
    var htmlText = "&nbsp;&nbsp;<a class='acBuyScriptCoupon' href=" + query + " style='color: blue;' target='_blank'>搜一下</a>";
    insNode.innerHTML = htmlText;
    faNode.appendChild(insNode);

    var hid_span = document.querySelector('#ald-skuRight > div > div.ald-hd > span');
    hid_span.innerText = '查找中...';
    var hack = document.querySelector("#ald-skuRight");
    var dv = document.createElement('ul');
    hack.insertBefore(dv, hack.children[0]);
    dv.className = 'ald-carousel';
    GM_xmlhttpRequest({
        method: "GET", responseType: 'jsonp',
        url: "http://" + host + "/api/jd/s?k=" + title,
        onload: function(resp) {
            AutoStart(100, "#ald-skuRight > div > div.ald-hd > span", function (){
                try{
                    var items = $.parseJSON(resp.responseText);
                    hid_span.style.display = 'none';
                    if(items.length === 0 || typeof(items) == 'string'){
                        hid_span.style.display='block';
                        hid_span.innerText = '未找到';

                    }
                    for(var i=0;i<items.length;i++){
                        item = items[i];
                        var pic_url = item.pic_url;
                        var item_link = item.item_link;
                        var coupon_url = item.item_coupon;
                        var coupon_info = item.coupon_info;
                        var price = item.price;
                        var item_title = item.title;
                        var i_node = tb_card(item_title, price, pic_url, item_link, coupon_url, coupon_info);
                        dv.appendChild(i_node);
                    }
                }catch(e) {
                    alert(e);
                    hid_span.style.display='block';
                    hid_span.innerText = '未找到';
                }
            });
        }
    });
}

if(location.host.indexOf('jd.com') > 0){
  var t = jd_get_title();
  jd_load(t.s_url, t.item, t.brand);
}else{
  AutoStart(100, "#ald-skuRight > div > div.ald-hd > span", function (){
      var t = tb_get_title();
      tb_load(t);
  });
}