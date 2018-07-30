<?xml version="1.0" encoding="UTF-8"?>
<!-- References -->

<!-- Media RSS: -->
<!-- https://www.bing.com/webmaster/help/media-rss-mrss-video-feed-specification-350cfabf -->

<!-- Extensions: -->
<!-- https://github.com/josephw/feedvalidator/wiki/ExtensionNamespaces -->
<xsl:transform
  version="3.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
>
  <xsl:output method="xml" />
  <xsl:template match="/">
    <rss version="2.0" xmlns:bing="http://bing.com/schema/media/">
      <channel>
        <!-- Feed Description Section - add some information to describe this feed.-->
        <site>Contoso.com</site>
        <webMaster>webmaster@contoso.com</webMaster>
        <feedType>incremental</feedType>
        <lastBuildDate>Wed, 26 Mar 2014 18:20:45 PST</lastBuildDate>
        <changefreq>daily</changefreq>

        <!-- For each video, create an item element.-->
        <item>
          <!-- Required tags. -->
          <title>Firefly - Serenity</title>
          <link>http://www.contoso.com/video?vid=12345</link>
          <pubDate>Wed, 26 Mar 2008 18:20:45 PST</pubDate>
          <description>The crew transports passengers to another planet to sell salvaged goods.</description>
          <content url="http://media.contoso.com/content/12345.mp4" type="video/mp4" medium="video" height="240" width="340" duration="243" fileSize="5000124"  bitrate="432" />
          <thumbnail url="http://www.contoso.com/thumbnails/12345.jpg" width="100" height="88"/>

          <!-- Optional but highly recommended tags. -->
          <keywords>tags, associated, with, video, comma,separated</keywords>
          <category>tvshow</category>
          <viewCount>200</viewCount>
          <embedHtml>&lt;embed src="http://www.contoso.com/12345.swf"&gt;&lt;/embed&gt;</embedHtml>

          <!-- Optional tags. -->
          <restriction relationship="allow" type="country">US, CA</restriction>
          <rating>nonadult</rating>
          <expireDate>Wed, 26 Mar 2008 18:20:45 PST </expireDate>
          <payment type="rent" price="10.00" currency="USD"/>
        </item>
        <item><!-- more items --></item>
      </channel>
    </rss>
  </xsl:template>
</xsl:transform>
