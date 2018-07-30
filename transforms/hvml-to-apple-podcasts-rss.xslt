<?xml version="1.0" encoding="UTF-8"?>
<!-- References -->

<!-- iTunes RSS: -->
<!-- https://github.com/simplepie/simplepie-ng/wiki/Spec:-iTunes-Podcast-RSS -->
<!-- http://podcasts.apple.com/resources/spec/ApplePodcastsSpecUpdatesiOS11.pdf -->
<!-- https://www.thepolyglotdeveloper.com/2016/02/create-podcast-xml-feed-publishing-itunes/ -->
<!-- https://s3-us-west-1.amazonaws.com/podcasts.thepolyglotdeveloper.com/podcast.xml -->

<!-- Extensions: -->
<!-- https://github.com/josephw/feedvalidator/wiki/ExtensionNamespaces -->
<xsl:transform
  version="3.0"
  xmlns="http://backend.userland.com/rss2"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:rawvoice="http://www.rawvoice.com/rawvoiceRssModule/"
  xmlns:hvml="http://vocab.nospoon.tv/ovml#"
  exclude-result-prefixes="hvml"
>
  <xsl:output
    method="xml"
    omit-xml-declaration="no"
  />

  <xsl:template match="/">
    <rss version="2.0">
      <xsl:apply-templates />
    </rss>
  </xsl:template>

  <xsl:template match="hvml:group[@type='series'][1]">
    <channel>
      <title><xsl:value-of select="hvml:title/text()" /></title>
      <link></link>
      <image></image>
      <description></description>
      <language></language>
      <copyright></copyright>
      <atom:link href="" rel="self" type="applicatoin/rss+xml" />
      <lastBuildDate></lastBuildDate>
      <itunes:author></itunes:author>
      <itunes:summary></itunes:summary>
      <itunes:subtitle></itunes:subtitle>
      <itunes:owner>
        <itunes:name></itunes:name>
        <itunes:email></itunes:email>
      </itunes:owner>
      <itunes:explicit></itunes:explicit>
      <itunes:keywords></itunes:keywords>
      <itunes:image href="" />
      <rawvoice:rating>TV-MA</rawvoice:rating>
      <rawvoice:location>Boston, Massachusetts</rawvoice:location>
      <rawvoice:frequency>Daily</rawvoice:frequency>
      <itunes:category text="Technology" />
      <itunes:category text="Education" />
      <pubDate></pubDate>
      <xsl:for-each select="hvml:group[@type='series']/hvml:video">
        <item>
          <title><xsl:value-of select="hvml:title" /></title>
          <link></link>
          <pubDate><xsl:value-of select="hvml:published" /></pubDate>
          <description></description>
          <enclosure></enclosure>
        </item>
      </xsl:for-each>
    </channel>
  </xsl:template>
</xsl:transform>
