<?php

/**
*weibo access token
*/

$response_type = "code";
$grant_type = "authorization_code";
$client_id = "1001928142";
$client_secret = "ea42ede815d550213d7778eea8e7bf5b";
$redirect_uri = "http://www.shouxinjk.net/oauth/weibo.php";
$state = "openapi";
$codeurl = 'https://api.weibo.com/oauth2/authorize';
$tokenurl = "https://api.weibo.com/oauth2/access_token?";

$code = $_GET["code"];

if ($code != "")
{
  $fields = [
      "grant_type" => urlencode($grant_type),
      "client_id" => urlencode($client_id),
      "redirect_uri" => urlencode($redirect_uri),
      "code" => urlencode($code),
      //"state" => urlencode($state),
      "client_secret" => urlencode($client_secret)
  ];

  $fields_string = "";
  foreach($fields as $key=>$value) {
     $fields_string .= $key.'='.$value.'&';
  }
  rtrim($fields_string, '&');

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $tokenurl.$fields_string);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);//method post
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  $result = curl_exec($ch);
  curl_close($ch);

  echo "Response：<br />".mb_convert_encoding($result,"UTF-8","GBK");

}
else
{
  header("Location: ".$codeurl."?response_type=".$response_type."&client_id=".$client_id."&redirect_uri=".$redirect_uri/*."&state=".$state*/);
}

?>
