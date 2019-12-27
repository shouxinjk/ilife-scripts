// ==UserScript==
// @name         携程-跟团游
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://vacations.ctrip.com/tour/detail/p*
// @grant        none
// ==/UserScript==

//示例URL
//https://vacations.ctrip.com/tour/detail/p14686888s28.html?kwd=%E8%89%B2%E8%BE%BE
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
    type:"tour",
    source:"ctrip",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"携程"
    },
    seller:{
        name:null,
    },
    producer:{
        name:null,
    },
    rank:{
        score:null,
        base:null,
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
    type:"tour",
    url:document.location.href
};


var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(next, 500);//需要设置页面跳转检查


(function() {
    'use strict';
    waitForKeyElements (".crumbs a:contains('携程旅游')", extract);//采集团队游线路
    //commitUrl(seed);//here is an example
})();

function extract(){
    if(debug){console.log("extract detail ...");}
    params();//从链接中提取标签
    waitForKeyElements (".detail_summary h1", title);
    waitForKeyElements (".service_guarantee span", tags);
    waitForKeyElements (".pro_img_box img", images);
    waitForKeyElements (".score_s em",rank_score);
    waitForKeyElements (".score_dp",rank_count);
    waitForKeyElements (".total_price:parent",price_sale);//售价
    //waitForKeyElements (".product_city span:parent",location_from);//出发地
    waitForKeyElements ("dt:contains('供应商')",supplier);//供应商
    waitForKeyElements (".detail_title_subhead", summary);
    waitForKeyElements (".pm_rec li", summary);
    waitForKeyElements (".J_introduction img", images);
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
    data.summary += jNode.text().replace(/\s+/g," ")+"<br/>";
    commit("summary");
}

function tags(jNode){
    var tag = jNode.text().replace(/\s+/g,"");
    if(tag.trim().length>2 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function tags_crumbs(jNode){
    var tag = jNode.text().trim();
    if(tag.trim().length>2 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_crumbs");
}

function tags_product(jNode){
    var tag = jNode.text().trim();
    if(data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_product");
}

function hotels(jNode){
    jNode.parent().find("a").each(function(){
        var hotel = $(this).text().trim();
        if(data.hotels.indexOf(hotel)<0){
            data.hotels.push(hotel);
        }
    });
    commit("hotels");
}

function sights(jNode){
    jNode.parent().find("a").each(function(){
        var sight = $(this).text().trim();
        if(data.sights.indexOf(sight)<0){
            data.sights.push(sight);
        }
    });
    commit("sights");
}

function activities(jNode){
    jNode.parent().find("a").each(function(){
        var fun = $(this).text().trim();
        if(data.activities.indexOf(fun)<0){
            data.activities.push(fun);
        }
    });
    commit("activities");
}

function images(jNode){
    //try load slide images from window.__INITIAL_STATE__
    if(window.__INITIAL_STATE__){
        images_slide();
    }
    jNode.find("img").each(function(){
        var img = fullUrl($(this).attr("data-src"));
        checkImage(img);
    });
}

function images_slide(){
    var images = window.__INITIAL_STATE__.ProductDetailV5.MediaInfo.ImgList;
    console.log("window.__INITIAL_STATE__",images);
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

//判定尺寸后提交，需要大于100*100
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=100 && img.height>=100 && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=100 && img.height>=100 && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
}

function rank_score(jNode){
    var score = jNode.text().match(/\d+\.*\d*/g);
    data.rank.score = score&&score[0]?Number(score[0]):null;
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d+/g);
    data.rank.count = count&&count[0]?Number(count[0]):null;
    commit("rank_count");
}

function price_sale(jNode){
    var price = jNode.text().match(/\d+\.*\d*/g)[0];
    data.price.sale =price?Number(price):null;
    commit("price_sale");
}

function location_from(jNode){
    var city = jNode.text().trim().replace(/出发地：/,"");//出发地：成都
    if(data.location.from.indexOf(city)<0){
        data.location.from.push(city);
        commit("location_from");
    }
}

function supplier(jNode){
    data.producer.name = jNode.parent().find("dd").text().trim().replace(/\s+/g,"");//供应商：携程自营
    commit("supplier");
}

//转换为web链接地址：需要去除附加信息，确保唯一性
//原始: http://vacations.ctrip.com/tour/detail/p1019251060s28.html?isFull=F#ctm_ref=hod_sr_lst_dl_n_1_4
//转换后: http://vacations.ctrip.com/tour/detail/p1019251060s28.html
function web(link){
    var id = link.match(/p\d+s\d+.html/);//p1019251060s28.html
    return "http://vacations.ctrip.com/tour/detail/"+id;
}

//转换为移动链接地址
//web: http://vacations.ctrip.com/tour/detail/p1019251060.html
//wap: https://m.ctrip.com/webapp/vacations/tour/detail?productId=1019251060
function wap(link){
    var ids = link.match(/\d+/g);//匹配后返回：1019251060
    return "https://m.ctrip.com/webapp/vacations/tour/detail?productId=_product"
        .replace(/_product/,ids[0]);
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
    return data.title && data.images.length>0 && data.price.sale && data.tags.length>0;
}

//navigate to next url
function next(){
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}



