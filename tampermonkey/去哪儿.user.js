// ==UserScript==
// @name         去哪儿
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://*.package.qunar.com/user/id=*
// @grant        none
// ==/UserScript==

//示例URL
//https://hqlx5.package.qunar.com/user/id=4259218086

var debug = false;

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
    source:"qunar",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"去哪儿"
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
    source:"qunar",
    type:"tour",
    url:document.location.href
};

(function() {
    'use strict';
    //判断是否符合URL规则
    var isMatch = window.location.href.match(/package\.qunar\.com\/user\/id=\d+/);
    if(isMatch && isMatch[0]){
        setTimeout(extract, 1000);//等待2秒加载价格
    }else{
        if(_debug)console.log("it is not a qunar tour url");
    }
    //commitUrl(seed);//here is an example
})();

function extract(){
    if(debug){console.log("extract detail ...");}
    params();//从链接中提取标签
    waitForKeyElements (".summary h1", title);
    waitForKeyElements (".basic-info em", tags);
    waitForKeyElements (".js-thumbnial img", images_slide);
    waitForKeyElements (".js-product-satisfaction",rank_score);
    waitForKeyElements (".js-total-comments",rank_count);
    waitForKeyElements ("#js-min-price",price_sale);//售价
    waitForKeyElements (".js-supplier-info-right strong",supplier);//供应商
    waitForKeyElements (".feature-row", summary);
    waitForKeyElements (".detail-tabcont img", images);
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
    data.title = jNode.text().replace(/\s+/g," ");
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
    var img = fullUrl(jNode.attr("data-original"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("lazyload-target"));
    checkImage(img);
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
    data.rank.score = score&&score[0]?(Number(score[0])/20).toFixed(1):null;
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
    data.producer.name = jNode.text().trim().replace(/\s+/g,"");//供应商：携程自营
    commit("supplier");
}

//转换为web链接地址：需要去除附加信息，确保唯一性
//原始: https://hqlx5.package.qunar.com/user/id=4259218086*****
//转换后: https://hqlx5.package.qunar.com/user/id=4259218086
function web(link){
    var id = link.match(/id=\d+/);//id=4259218086
    return "https://hqlx5.package.qunar.com/user/"+id;
}

//转换为移动链接地址
//web: https://hqlx5.package.qunar.com/user/id=4259218086
//wap: http://touch.dujia.qunar.com/detail.qunar?id=4118313250
function wap(link){
    var id = link.match(/id=\d+/);//id=4259218086
    return "http://touch.dujia.qunar.com/detail.qunar?"+id;
}

//commit data
function commit(key){
    if(validate()){
        if(debug)console.log("validate succeed. [prop]"+key,data);
        commitData(data,next);
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
    if(!debug){_next()};
}



