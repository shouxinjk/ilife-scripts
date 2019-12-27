// ==UserScript==
// @name         携程-度假-景+酒
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract hotel+ticket line
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://vacations.ctrip.com/tour/detail/*
// @match        https://vacations.ctrip.com/tour/detail/*
// @grant        none
// ==/UserScript==

//示例URL
//http://vacations.ctrip.com/tour/detail/p19348584r2001.html
//https://vacations.ctrip.com/tour/detail/p19501336.html
if(this.jQuery){
    this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict
}

var debug = false;//isProduction("ctrip");

var schema={
//TODO: validate and commit
};

var data={
    task:{
        user:"userid",//注册的编码
        executor:"machine",//机器标识
            timestamp:new Date().getTime(),//时间戳
            url:window.location.href//原始浏览地址
    },
    url:web(window.location.href),
    type:"hotel_ticket",
    source:"ctrip",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    producer:{
        name:null,
    },
    distributor:{
        name:"携程"
    },
    seller:{
        name:null,
    },
    rank:{
        score:null,
        base:5,
        count:null,
        match:0.75//by default
    },
    link:{
        web:web(window.location.href),//web浏览地址
        wap:wap(window.location.href)//移动端浏览地址，默认与web一致
    }
};

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine",//机器标识
        url:window.location.href//原始浏览地址
    },
    source:"ctrip",
    type:"hotel_ticket",
    url:document.location.href
};

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(next, 500);//需要设置页面跳转检查

(function() {
    'use strict';
    waitForKeyElements (".crumbs a:contains('酒店+景点')", extract);//采集酒店+景点线路
    //commitUrl(seed);//here is an example
})();

function extract(){
    if(debug){console.log("extract 景点+酒店 ...");}
    params();//从链接中提取标签
    waitForKeyElements (".detail_main_title h2:parent", title);
    waitForKeyElements (".product_feature p", summary);
    waitForKeyElements (".htl_daynumbox a", tags);
    waitForKeyElements (".crumbs a:first", tags_crumbs);
    waitForKeyElements (".product_item .product_item_con a", tags_item);
    waitForKeyElements (".product_feature", images);
    //waitForKeyElements (".product_item_tit:contains('关联景点')", sights);
    //waitForKeyElements (".product_item_tit:contains('包含酒店')", hotels);
    waitForKeyElements (".comment_wrap .score:first",rank_score);
    waitForKeyElements (".comment_num",rank_count);
    waitForKeyElements (".total_price:parent",price_sale);//售价
    //waitForKeyElements (".crumbs a:last", location_dest);
    waitForKeyElements (".product_supplier",supplier);//供应商
}

//从地址中获取标签
//参数形式为： tags=xxx,yyy,zzz
function params(){
    var q = _getQuery();
    if(q.tags && q.tags.length>0){//tags=xxx,sss,ddd
        var tags = q.tags.split(",");
        for(var i=0;i<tags.length;i++){
            var tag = tags[i];
            if(tag.length>0 && data.tags.indexOf(tag)<0){
                data.tags.push(tag);
            }
        }
        commit("url_tags");
    }
}

function title(jNode){
    data.title = jNode.text();
    commit("title");
}

function summary(jNode){
    var txt = jNode.text().replace(/\s+/g,"");
    data.summary += txt.length>0?txt+"<br/>":"";
    commit("summary");
}

function tags(jNode){
    var tag = jNode.text().trim().split("(")[0];
    if(data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function tags_crumbs(jNode){
    var tag = jNode.text().replace(/\s+/g,"");
    if(data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_crumbs");
}

function tags_item(jNode){
    var tag = jNode.text().replace(/\s+/g,"");
    if(data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_item");
}

function hotels(jNode){
    jNode.parent().find(".product_item_con a").each(function(){
        var hotel = $(this).text().trim();
        if(data.hotels.indexOf(hotel)<0){
            data.hotels.push(hotel);
        }
    });
    commit("hotels");
}

function sights(jNode){
    jNode.parent().find(".product_item_con a").each(function(){
        var sight = $(this).text().trim();
        if(data.sights.indexOf(sight)<0){
            data.sights.push(sight);
        }
    });
    commit("sights");
}

function images(jNode){
    //try load slide images from window.__INITIAL_STATE__
    if(window.__INITIAL_STATE__){
        images_slide();
    }
    jNode.find("img").each(function(){
        var img = fullUrl($(this).attr("src"));
        checkImage(img);
    });
}

function images_slide(){
    var images = window.__INITIAL_STATE__.ProductDetailV5.MediaInfo.ImgList;
    if(debug){console.log("window.__INITIAL_STATE__",images);}
    for(var i=0;i<images.length;i++){
        var urls = images[i].UrlList;
        for(var j=0;j<urls.length;j++){
            var img=fullUrl(urls[j].Value);
            if(data.images.indexOf(img)<0){
                data.images.push(img);
            }
        }
    }
}

//判定尺寸后提交，需要大于400*300
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=400 && img.height>=300 && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=400 && img.height>=300 && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
}

function rank_score(jNode){
    var score = jNode.text().match(/\d+\.*\d*/g);
    data.rank.score = score[0];
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d+/g);
    data.rank.count = count[0];
    commit("rank_count");
}

function price_sale(jNode){
    data.price.sale = jNode.text().match(/\d+\.*\d*/g)[0];
    commit("price_sale");
}

function location_dest(jNode){
    //try load slide images from window.__INITIAL_STATE__
    if(window.__INITIAL_STATE__){
        var obj = window.__INITIAL_STATE__.ProductDetailV5.BasicInfo;
        if(debug){console.log("window.__INITIAL_STATE__",obj);}
        var country = obj.DestinationCountryName;
        var province = obj.DestProvinceName;
        var city = obj.DestCityName;
        var dest = country?country:"";
        dest += province?" "+province:"";
        dest += city?" "+city:"";
        dest = dest.trim();
        if(data.location.dest.indexOf(dest)<0){
            data.location.dest.push(dest);
        }
    }
}

function supplier(jNode){
    data.seller.name = jNode.text().trim().replace(/供应商：/,"");//供应商：携程自营
    commit("seller");
}

//转换为web链接地址：需要去除附加信息，确保唯一性
//原始: http://vacations.ctrip.com/tour/detail/p19348584r2001.html?isFull=F#ctm_ref=hod_sr_lst_dl_n_1_4
//转换后: http://vacations.ctrip.com/tour/detail/p19348584r2001.html
function web(link){
    var ids = link.match(/\d+/g);//p19348584r2001.html 注意有可能只有第一段productid
    var url = "";
    if(ids.length>0){
        url += "http://vacations.ctrip.com/tour/detail/p"+ids[0];
        if(ids.length>1){
            url += "r"+ids[1];
        }
        url += ".html";
    }
    return url;
}

//转换为移动链接地址
//web: http://vacations.ctrip.com/tour/detail/p19348584r2001.html
//wap: https://m.ctrip.com/webapp/vacations/diysh/detail?productid=19348584&ruleid=2001
function wap(link){
    var ids = link.match(/\d+/g);//匹配后返回：19348584、2001（可能只有一个返回，即：没有ruleid）
    var url = "";
    if(ids.length>0){
        url += "https://m.ctrip.com/webapp/vacations/diysh/detail?productid="+ids[0];
        if(ids.length>1){
            url += "&ruleid="+ids[1];
        }
    }
    return url;
}

//commit data
function commit(key){
    if(validate()){
        if(debug)console.log("validate succeed. [prop]"+key,data);
        commitData(data,next);
        commitTime = new Date().getTime();
    }else{
        if(debug)console.log("validate failed.[prop]"+key,data);
    }
}

//validate data collected
function validate(){
    //TODO use json schema to validate data
    return data.title && data.summary.length>0 && data.images.length>0 && data.price.sale && data.tags.length>0 && data.link.wap.length>0 && data.link.web.length>0;
}

//navigate to next url
function next(){
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}



