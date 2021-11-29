
/**
选品助手。

构建列表展示页面，便于选择
*/
var _sxdebug = false;

function sxInitialize(jNode){
    //监听达人扫码绑定消息
    listenPostMessage();
    //显示达人信息
    var brokerName = "请扫码绑定达人";
    var brokerLogo = "https://biglistoflittlethings.com/ilife-web-wx/images/icon.jpeg";

    //设置操作按钮：显示或隐藏
    var htmlBtn = "";
    htmlBtn += '<div id="sxHideBtnDiv" class="info" style="position:fixed;z-index:2147483647;top:0px;right:0px;background-color:#fff;width:50px;height:20px;border-radius:5px;display:none">';
    htmlBtn += '<div style="line-height:22px;color:grey;">隐藏</div>';
    htmlBtn += '</div>';
    //show btn
    htmlBtn += '<div id="sxShowBtnDiv" class="info" style="position:fixed;z-index:2147483647;top:0px;right:0;background-color:#fff;width:44px;height:150px;border-radius:5px;padding-left:12px;display:block">';
    htmlBtn += '<div class="info-general">';
    htmlBtn += '<img class="general-icon" src="'+brokerLogo+'" width="30" height="30"/>';
    htmlBtn += '</div>';
    htmlBtn += '<div class="info-detail" style="text-align:left">';
    htmlBtn += '<div class="info-text info-blank" style="color:#000;font-size:14px;height:100px">查<br/>看<br/>详<br/>情</div>';
    htmlBtn += '</div>';

    jNode.append(htmlBtn);

    var html = "";
    html += "<div id='sxDiv' style='position:fixed;z-index:2147483646;top:0px;right:0px;background-color:#fff;min-width:400px;width:20%;height:100%;border-radius:5px;display:none;border-left:1px solid silver;'>";
    //broker info
    html += '<div id="brokerInfoDiv" class="info" style="background-image:none;">';
    html += '<div class="info-general">';
    html += '<img id="broker-logo" class="general-icon" src="'+brokerLogo+'" height="60px"/>';
    html += '</div>';
    html += '<div class="info-detail" style="text-align:left">';
    html += '<div id="broker-name" class="info-text info-blank" style="color:#000;font-weight:bold;font-size:14px;">'+brokerName+'</div>';
    html += '<div class="info-text info-blank" id="brokerHint"  style="color:#000">数据完善更利于被用户发现<br/>请补充完善并提交</div>';
    html += '</div>';
    html += '</div>';
    //search result
    html += '<div id="sxListDiv" class="list">';
    html += '<iframe id="sxListFrame" src="https://www.biglistoflittlethings.com/ilife-web-wx/login.html?nonce='+new Date().getTime()
        +'&targetUrl='+encodeURIComponent("https://www.biglistoflittlethings.com/ilife-web-wx/index_crawler.html")+'" width="100%" height="400px" frameborder="0" sandbox="allow-scripts allow-same-origin">';
    html += '</div>';
    html += "</div>";
    jNode.append(html);

    //读取面板显示状态：通过postMessage向iframe请求cookie得到
    if(_sxdebug)console.log("post message to get sxToolbarStatus ");
    document.getElementById('sxListFrame').contentWindow.postMessage({
      sxCookie:{
        action:"get",
        key:"sxToolbarStatus"
      }
    }, "*");//向父窗口发出消息，查询sxAuth

    //调整iframe高度
    var iframeHeight = $('#sxDiv').height()-$('#brokerInfoDiv').height();
    $("#sxListFrame").height(iframeHeight);

    //隐藏事件
    $("#sxHideBtnDiv").click(function(event){
        $("#sxHideBtnDiv").css("display","none");
        $("#sxShowBtnDiv").css("display","block");
        $("#sxDiv").css("display","none");

        //存入缓存，能够在多个界面中保持一致
        var data = {
            sxCookie:{
                action: 'set',
                key:"sxToolbarStatus",
                value:{show:false}
            }
        };
        if(_sxdebug)console.log("try to post sxToolbar status message to iframe.",data);
        document.getElementById('sxListFrame').contentWindow.postMessage(data, '*');
    });
    $("#sxShowBtnDiv").click(function(event){
        $("#sxShowBtnDiv").css("display","none");
        $("#sxHideBtnDiv").css("display","block");
        $("#sxDiv").css("display","block");

        //存入缓存，能够在多个界面中保持一致
        var data = {
            sxCookie:{
                action: 'set',
                key:"sxToolbarStatus",
                value:{show:true}
            }
        };
        if(_sxdebug)console.log("try to post sxToolbar status message to iframe.",data);
        document.getElementById('sxListFrame').contentWindow.postMessage(data, '*');
    });
}

function listenPostMessage(){
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    // Listen to message from child window
    eventer(messageEvent,function(e) {
        var key = e.message ? "message" : "data";
        var data = e[key];
        if(_sxdebug)console.log("got message from child window.",data);
        if(data&&data.sxBrokerName){//更新达人名称，同时显示 切换按钮。点击切换后将删除sxCookie
            var brokerName = "Hi,"+data.sxBrokerName+(data.sxBrokerOrgnization&&data.sxBrokerOrgnization.trim().length>0?("("+data.sxBrokerOrgnization+")"):"");
            brokerName += "&nbsp;<a href='#' style='font-size:12px;color:silver' id='sxChangeBroker' alt='切换账户'><img width='12' text='切换账户' style='vertical-align:middle; margin: 0 auto; ' src='https://www.biglistoflittlethings.com/ilife-web-wx/images/change.png'/></a>";
            $("#broker-name").html(brokerName);
            $("#sxChangeBroker").click(function(event){
                //删除sxCookie
                if(_sxdebug)console.log("try to remove broker info.");
                document.getElementById('sxListFrame').contentWindow.postMessage({
                    sxCookie:{
                        action:"set",
                        key:"sxAuth",
                        value:{}//清空change
                    }
                }, "*");
                //修改iframe页面
                //**
                $("#sxListFrame").attr("src","https://www.biglistoflittlethings.com/ilife-web-wx/login.html?nonce="+new Date().getTime()
                                       +'&targetUrl='+encodeURIComponent("https://www.biglistoflittlethings.com/ilife-web-wx/index_crawler.html"));
                //**/
                //刷新界面，直接重新进入
                //window.location.href = window.location.href;
            });
        }
        if(data&&data.sxBrokerLogo)//更新达人Logo
            $("#broker-logo").attr("src",data.sxBrokerLogo);
        if(data&&data.sxNavigateTo){//实现frame内页面跳转
            if(_sxdebug)console.log("try to navigate iframe to new src.",data.sxNavigateTo);
            $("#sxListFrame").attr("src", data.sxNavigateTo );
        }
        if(data&&data.sxCookie){//实现缓存数据交换
            var sxCookie  = data.sxCookie;//JSON.parse(data.sxCookie);
            if(_sxdebug)console.log("got message.",sxCookie);
            if (sxCookie.action == 'return'){//从iframe cookie中查询获得数据
                //如果是sxToolbarStatus 则修改显示状态
                if (sxCookie.key == 'sxToolbarStatus'){
                    var isShowlistHelper = sxCookie.value;
                    if(isShowlistHelper.show){
                        $("#sxHideBtnDiv").css("display","block");
                        $("#sxDiv").css("display","block");
                        $("#sxShowBtnDiv").css("display","none");
                    }else{//如果隐藏面板
                        $("#sxHideBtnDiv").css("display","none");
                        $("#sxDiv").css("display","none");
                        $("#sxShowBtnDiv").css("display","block");
                    }
                }
            }
        }
        if(data && data.sxRedirect){
            if(_sxdebug)console.log("try to redirect",data.sxRedirect);
            if(data.sxTargetWindow){
                window.open(data.sxRedirect,data.sxTargetWindow);
            }else{
                window.open(data.sxRedirect);
            }
        }
    },false);
}
