// ==UserScript==
// @name         遨游-跟团游
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://www.aoyou.com/domesticgroup/*
// @grant        none
// ==/UserScript==

//示例URL
//http://www.aoyou.com/domesticgroup/g31266i2
if(this.jQuery){
    this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict
}

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
    source:"aoyou",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"遨游"
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
    source:"aoyou",
    type:"tour",
    url:document.location.href
};

(function() {
    'use strict';
    //waitForKeyElements (".crumbs a:contains('携程旅游')", extract);//采集团队游线路
    setTimeout(extract, 1000);//等待2秒加载价格
    //commitUrl(seed);//here is an example
})();

function extract(){
    if(debug){console.log("extract detail ...");}
    params();//从链接中提取标签
    waitForKeyElements (".productname", title);
    waitForKeyElements (".icon-default", tags);
    waitForKeyElements (".productInfo-id-left", tags_product);
    waitForKeyElements (".crumbs-nav a", tags_crumb);
    waitForKeyElements (".productInfoBox-picGetReady li img", images_slide);
    waitForKeyElements (".score_s em",rank_score);
    waitForKeyElements (".score_dp",rank_count);
    waitForKeyElements ("#aoyouPrice",price_sale);//售价
    waitForKeyElements (".productInfo-id-left b",supplier);//供应商
    waitForKeyElements ("span:contains('行程亮点')", summary);
    waitForKeyElements (".content-box img", images);
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
    data.summary += jNode.next().find("p").text().replace(/\s+/g," ")+"<br/>";
    commit("summary");
}

function tags(jNode){
    var tag = jNode.text().replace(/\s+/g,"");
    if(tag.trim().length>2 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function tags_crumb(jNode){
    var tag = jNode.attr("title")?jNode.attr("title").trim():"";
    if(tag.trim().length>2 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_crumb");
}

function tags_product(jNode){
    var tags = jNode.text().replace(/\s+/g,"，").split("，");
    for(var i=0;i<tags.length;i++){
        var tag = tags[i];
        if(tag.trim().length>2 && data.tags.indexOf(tag)<0){
            data.tags.push(tag);
        }
    }
    commit("tags_product");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("src").replace(/w\/96\/h\/64/,"w/570/h/380"));
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
//原始: http://www.aoyou.com/domesticgroup/g31266i2?***
//转换后: http://www.aoyou.com/domesticgroup/g31266i2
function web(link){
    var id = link.match(/domesticgroup\/[a-z0-9]+/);//g31266i2
    return "http://www.aoyou.com/"+id;
}

//转换为移动链接地址
//web: http://www.aoyou.com/domesticgroup/g31266i2
//wap: https://m.aoyou.com/group.html?pid=31266&i2&noapp=1
function wap(link){
    var ids = link.match(/\d+/g);//匹配后返回：31266，2
    return "https://m.aoyou.com/group.html?pid=_product&i_category"
        .replace(/_product/,ids[0])
        .replace(/_category/,ids[1]);
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



