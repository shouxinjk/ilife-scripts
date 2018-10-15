<?php
/**
  * wechat php test
  */

//define your token
define("TOKEN", "qchzhu");
$wechatObj = new wechatCallbackapiTest();

//for token validation
//$wechatObj->valid();

//for auto-responding
$wechatObj->responseMsg();

class wechatCallbackapiTest
{
	public function valid()
    {
        $echoStr = $_GET["echostr"];

        //valid signature , option
        if($this->checkSignature()){
        	echo $echoStr;
        	exit;
        }
    }

    public function responseMsg()
    {
		//get post data, May be due to the different environments
		$postStr = $GLOBALS["HTTP_RAW_POST_DATA"];

      	//extract post data
		if (!empty($postStr)){
                
              	$postObj = simplexml_load_string($postStr, 'SimpleXMLElement', LIBXML_NOCDATA);
                $fromUsername = $postObj->FromUserName;
                $toUsername = $postObj->ToUserName;
                $keyword = trim($postObj->Content);
                $time = time();
                $textTpl = "<xml>
							<ToUserName><![CDATA[%s]]></ToUserName>
							<FromUserName><![CDATA[%s]]></FromUserName>
							<CreateTime>%s</CreateTime>
							<MsgType><![CDATA[%s]]></MsgType>
							<Content><![CDATA[%s]]></Content>
							<FuncFlag>0</FuncFlag>
							</xml>";   

				//获取事件类型
				$type=$postObj->MsgType;
				if($type=='event'){
					$event = $postObj->Event;
					if($event=='subscribe'){
						$contentStr= "小确幸，大生活。欢迎关注。";
						$msgType = "text";
						$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
						echo $resultStr;
					}else if($event=='unsubscribe'){
						$contentStr= "客官慢走，欢迎再来。";
						$msgType = "text";
						$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
						echo $resultStr;
					}else if($event=='CLICK'){
						$contentStr= "自定义菜单";
						$msgType = "text";
						$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
						echo $resultStr;
					}
				}else if($type=='location'){
					$label = $postObj->Label;
					$locationX = $postObj->Location_X;
					$locationY = $postObj->Location_Y;
					$msgType = "text";
					$responseTpl="【LOC】%s 【X】%s【Y】%s";
					$contentStr = sprintf($responseTpl,$label,$locationX,$locationY);
					$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
					echo $resultStr;
				}else if($type=='text'){
					if(!empty( $keyword )){//here we return an article list
						$msgType = "news";
						$listTpl=" <xml>
									 <ToUserName><![CDATA[%s]]></ToUserName>
									 <FromUserName><![CDATA[%s]]></FromUserName>
									 <CreateTime>%s</CreateTime>
									 <MsgType><![CDATA[%s]]></MsgType>
									 <ArticleCount>%s</ArticleCount>
									 <Articles>%s</Articles>
									 </xml> ";
						$itemTpl = " <item>
									 <Title><![CDATA[%s]]></Title> 
									 <Description><![CDATA[%s]]></Description>
									 <PicUrl><![CDATA[%s]]></PicUrl>
									 <Url><![CDATA[%s]]></Url>
									 </item>";
						$itemList = "";
						$itemCount = 0;			 

						//从搜索引擎获取
						$query_data='{
						    "query": {
						        "match" : { 
						          "full_text":"'.$keyword.'" 
						        }
						    }
						}';
						$es_url = "http://search.pcitech.cn/stuff/_search";
						$result = $this->send_request($es_url,$query_data,null,'POST','application/json');
						$json = json_decode($result);
						$hits = $json->hits;
						for($i=0;$i<$hits->total && $i<3;$i++){//最多只显示3条:由于调整为仅显示一条，即使设置多条也无效！！
							$object = $hits->hits[$i]->_source;
							$tagstr="";
							for($k=0;$k<count($object->tags);$k++){
								$tag = $object->tags[$k];
								$tagstr = $tagstr." ".$tag;
							}
							$title = $object->title.$tagstr; // title is a field of your content type
							$description = str_replace("<br/>","\n",$object->summary);
							if(strlen($description)>200){
								$description = substr($description,0,199)."...";//限制长度为100个汉字，共300字符
							}
							$picUrl = $object->images[0];//取第一张照片作为LOGO							
							$linkUrl = "http://www.shouxinjk.net/list/info.html?id=".$object->_key;
							$itemStr = sprintf($itemTpl,$title,$description,$picUrl,$linkUrl);
							$itemList = $itemList.$itemStr;
							$itemCount ++;
						}
						if($hits->total > $itemCount){//如果有更多内容没显示完，则增加跳转链接
							$title = "小确幸，大生活";
							$description = '更多和"'.$keyword.'"相关的东东。快来看看';
							$num = 100+mt_rand(0, 10);
							$picUrl = 	"http://www.shouxinjk.net/list/images/logo".substr($num,1,2).".jpeg";							
							$linkUrl = "http://www.shouxinjk.net/list/index.html?keyword=".$keyword;
							$itemStr = sprintf($itemTpl,$title,$description,$picUrl,$linkUrl);
							$itemList = $itemList.$itemStr;
							$itemCount ++;
						}
//*/
						//从数据库直接读取数据
						/*
						$url = "http://data.shouxinjk.net/_db/sea/my/stuff";
						$lines_array = file($url);
						$lines_string = implode('',$lines_array);            
						$json = htmlspecialchars($lines_string,ENT_NOQUOTES);
						$array = json_decode($json);
						for($i=0;$i<count($array);$i++){
							if($itemCount>4)//we only display 4 items for mobile
								break;
							$object = $array[$i]; // The array could contain multiple instances of your content type
							$tagstr="";
							for($k=0;$k<count($object->tags);$k++){
								$tag = $object->tags[$k];
								$tagstr = $tagstr." ".$tag;
							}
							$title = $object->title.$tagstr; // title is a field of your content type
							$description = str_replace("<br/>","\n",$object->summary);
							$picUrl = 	$object->images[0];//取第一张照片作为LOGO							
							$linkUrl = "http://www.shouxinjk.net/list/info.html?id=".$object->_key;
							$itemStr = sprintf($itemTpl,$title,$description,$picUrl,$linkUrl);
							$itemList = $itemList.$itemStr;
							$itemCount ++;
						}
						//*/

						if($itemCount == 0){//没有符合要求的内容则提示，并跳转到首页
							$title = "小确幸，大生活";
							$description = '好像没有和"'.$keyword.'"相关的东东。直接来看看吧';
							$num = 100+mt_rand(0, 10);
							$picUrl = 	"http://www.shouxinjk.net/list/images/logo".substr($num,1,2).".jpeg";							
							$linkUrl = "http://www.shouxinjk.net/list";
							$itemStr = sprintf($itemTpl,$title,$description,$picUrl,$linkUrl);
							$itemList = $itemList.$itemStr;			
							$itemCount ++;					
						}

						$resultStr = sprintf($listTpl, $fromUsername, $toUsername, $time, $msgType,$itemCount, $itemList);						
						echo $resultStr;

						/*
						if($itemCount>0){
							$resultStr = sprintf($listTpl, $fromUsername, $toUsername, $time, $msgType,$itemCount, $itemList);
							echo $resultStr;
						}else{//如果没有则引导到首页
							$msgType = "news";
							//$itemCount = 1;
							$title = "小确幸，大生活";
							$description = '好像没有和"'.$keyword.'"相关的东东。直接来看看吧';
							$num = 100+mt_rand(0, 10);
							$picUrl = 	"http://www.shouxinjk.net/list/images/logo".substr($num,1,2).".jpeg";							
							$linkUrl = "http://www.shouxinjk.net/list";
							$itemStr = sprintf($itemTpl,$title,$description,$picUrl,$linkUrl);
							$itemList = $itemList.$itemStr;	
							$resultStr = sprintf($listTpl, $fromUsername, $toUsername, $time, $msgType,1, $itemList);						
							echo $resultStr;						
						}
						//*/
					}else{
						echo "【敬请关注】我们正在努力，请稍等稍等";
					}
				}else if($type=='image'){
					$picURL = $postObj->PicUrl;
					$msgType = "text";
					$responseTpl="【Image URL】%s";
					$contentStr = sprintf($responseTpl,$picURL);
					$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
					echo $resultStr;
				}else if($type=='link'){
					$linkURL = $postObj->Url;
					$msgType = "text";
					$responseTpl="【Link URL】%s";
					$contentStr = sprintf($responseTpl,$linkURL);
					$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
					echo $resultStr;
				}else{
					echo "当前还不支持语音、图片、链接等形式哦";
				}
        }else {
        	echo "error";
        	exit;
        }
    }

	/**
	 * 发送HTTP请求
	 *
	 * @param string $url 请求地址
	 * @param string $method 请求方式 GET/POST
	 * @param string $refererUrl 请求来源地址
	 * @param array $data 发送数据
	 * @param string $contentType 
	 * @param string $timeout
	 * @param string $proxy
	 * @return boolean
	 */
	function send_request($url, $data, $refererUrl = '', $method = 'GET', $contentType = 'application/json', $timeout = 30, $proxy = false) {
	    $ch = null;
	    if('POST' === strtoupper($method)) {
	    	$header =array();
			$header[] ='Authorization:Basic ZWxhc3RpYzpjaGFuZ2VtZQ==';//注意：这里为硬编码写死，需要改进
	        $ch = curl_init($url);
	        curl_setopt($ch, CURLOPT_POST, 1);
	        curl_setopt($ch, CURLOPT_HEADER,0 );
	        curl_setopt($ch, CURLOPT_FRESH_CONNECT, 1);
	        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	        curl_setopt($ch, CURLOPT_FORBID_REUSE, 1);
	        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
	        if ($refererUrl) {
	            curl_setopt($ch, CURLOPT_REFERER, $refererUrl);
	        }
	        if($contentType) {
	            curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:'.$contentType));
	            $header[] ='Content-Type:'.$contentType;
	        }
	        if(is_string($data)){
	            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
	        } else {
	            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
	        }
	        curl_setopt($ch,CURLOPT_HTTPHEADER,$header);
	    } else if('GET' === strtoupper($method)) {
	        if(is_string($data)) {
	            $real_url = $url. (strpos($url, '?') === false ? '?' : ''). $data;
	        } else {
	            $real_url = $url. (strpos($url, '?') === false ? '?' : ''). http_build_query($data);
	        }
	        $ch = curl_init($real_url);
	        curl_setopt($ch, CURLOPT_HEADER, 0);
	        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:'.$contentType));
	        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
	        if ($refererUrl) {
	            curl_setopt($ch, CURLOPT_REFERER, $refererUrl);
	        }
	    } else {
	        $args = func_get_args();
	        return false;
	    }
	    if($proxy) {
	        curl_setopt($ch, CURLOPT_PROXY, $proxy);
	    }
	    $ret = curl_exec($ch);
	    $info = curl_getinfo($ch);
	    $contents = array(
	            'httpInfo' => array(
	                    'send' => $data,
	                    'url' => $url,
	                    'ret' => $ret,
	                    'http' => $info,
	            )
	    );
	    curl_close($ch);
	    return $ret;
	}

	private function checkSignature()
	{
        $signature = $_GET["signature"];
        $timestamp = $_GET["timestamp"];
        $nonce = $_GET["nonce"];	
        		
		$token = TOKEN;
		$tmpArr = array($token, $timestamp, $nonce);
		sort($tmpArr);
		$tmpStr = implode( $tmpArr );
		$tmpStr = sha1( $tmpStr );
		
		if( $tmpStr == $signature ){
			return true;
		}else{
			return false;
		}
	}
}

//避免找不到函数定义，此处未引用其他类库，创建新函数
if (!function_exists('http_build_query')) {
	function http_build_query($data, $prefix='', $sep='', $key='') {
	   $ret = array();
	   foreach ((array)$data as $k => $v) {
	       if (is_int($k) && $prefix != null) $k = urlencode($prefix . $k);
	       if (!empty($key)) $k = $key.'['.urlencode($k).']';
	       
	       if (is_array($v) || is_object($v))
	           array_push($ret, http_build_query($v, '', $sep, $k));
	       else    array_push($ret, $k.'='.urlencode($v));
	   }
	 
	   if (empty($sep)) $sep = ini_get('arg_separator.output');
	   return implode($sep, $ret);
	}
}

?>
