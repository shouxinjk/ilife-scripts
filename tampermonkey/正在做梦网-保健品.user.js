// ==UserScript==
// @name         正在做梦网-保健品
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://www.zhengzai.com.cn/goods-*
// @grant        none
// ==/UserScript==

//示例URL
//http://www.zhengzai.com.cn/goods-148.html

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

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
    type:"dietary",
    source:"zhengzai",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    props:[],
    distributor:{
        name:"正在做梦网"
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
        executor:"machine"//机器标识
    },
    source:"zhengzai",
    type:"dietary",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

(function() {
    'use strict';
    params();
    waitForKeyElements (".sptit", title);
    waitForKeyElements ("#cons_1_0 p span", summary);
    waitForKeyElements ("input[id='cityname']",city);
    waitForKeyElements ("input[id='typea1']", tags);
    waitForKeyElements ("#thumblist li a", images_logo);//logo
    waitForKeyElements ("#cons_1_0 p img", images);//正文部分的图片提取
    waitForKeyElements (".star5",rank_score);//没有评分
    //waitForKeyElements ("span[itemprop='reviewCount']",rank_count);//没有评分
    waitForKeyElements ("#ECS_SHOPPRICE",price_sale);
    waitForKeyElements (".market:first",price_bid);
    waitForKeyElements ("#cons_1_1 table tr",props);
    //commitUrl(seed);//here is an example
})();

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
    data.title = jNode.text().replace(/\s+/g,"");
    commit("title");
}

function summary(jNode){
    var txt = jNode.text().replace(/\s+/g,"").trim();
    if(txt.length>0){
        data.summary += jNode.text().replace(/\s+/g,"")+"<br/>";
        commit("summary");
    }
}

function venu(jNode){
    data.venu = jNode.text().replace(/\s+/g,"").replace(/演出场馆：/g,"");
    commit("venu");
}

function tags(jNode){
    var tag=jNode.val();
    if(data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function city(jNode){
    data.city = jNode.val();
    commit("city");
}

function images_logo(jNode){
    var rel = jNode.attr("rel").replace(/,/g,",'").replace(/:/g,"':").replace(/{/g,"{'").replace(/\s*/g,"").replace(/'/g,"\"");
    //console.log(rel);
    var json = JSON.parse(rel);
    var img = fullUrl(json.largeimage);
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

function rank_score(jNode){
    var score = jNode.attr("title").match(/\d*\.*\d/g);//5星。
    data.rank.score = score[0];
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d*\.*\d/g);//53位住客点评
    data.rank.count = count[0];
    commit("rank_count");
}

function price_sale(jNode){
    var price = jNode.text().match(/\d+/g);
    data.price.sale = price[0];
    commit("price_sale");
}

function price_bid(jNode){
    var price = jNode.text().match(/\d+/g);
    data.price.bid = price[0];
    commit("price_bid");
}

function props(jNode){
    if(jNode.find("td[width='30%']") && jNode.find("td[width='70%']")){
        var key = jNode.find("td[width='30%']").text().replace(/\s*\[*\]*/g,"");
        var value = jNode.find("td[width='70%']").text().replace(/\s*\[*\]*/g,"");
        var prop = {
            key:key,
            value:value
        };
        data.props.push(prop);
        //将产地、品牌、产品剂型作为tag
        if(key == "产地" || key == "品牌" || key == "产品剂型"){
            data.tags.push(value);
        }
    }
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//http://www.zhengzai.com.cn/goods-150.html
function web(link){
    var str = link.match(/\d+.html/)[0];//匹配后返回：150.html
    return "http://www.zhengzai.com.cn/goods-"+str;
}

//转换为移动链接地址
//web: http://www.zhengzai.com.cn/goods-150.html
//wap: http://m.zhengzai.com.cn/goods-150.html
function wap(link){
    var str = link.match(/\d+.html/)[0];//匹配后返回：150.html
    return "http://m.zhengzai.com.cn/goods-"+str;
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
    return data.title && data.images.length>0 && data.price.sale;
}

//navigate to next url
function next(){
    if(!debug){_next();}
}



