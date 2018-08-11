<?xml version="1.0" encoding="UTF-8"?>
<!-- References -->

<!-- RSS 2.0 -->
<!-- http://www.rssboard.org/rss-specification -->

<!-- iTunes RSS: -->
<!-- https://github.com/simplepie/simplepie-ng/wiki/Spec:-iTunes-Podcast-RSS -->
<!-- http://podcasts.apple.com/resources/spec/ApplePodcastsSpecUpdatesiOS11.pdf -->
<!-- https://www.thepolyglotdeveloper.com/2016/02/create-podcast-xml-feed-publishing-itunes/ -->
<!-- https://s3-us-west-1.amazonaws.com/podcasts.thepolyglotdeveloper.com/podcast.xml -->
<!-- https://itunespartner.apple.com/en/podcasts/faq -->
<!-- https://help.apple.com/itc/podcasts_connect/#/itc1723472cb -->

<!-- Flipboard RSS: -->
<!-- https://about.flipboard.com/rss-spec/ -->

<!-- Content Categories -->
<!-- https://help.apple.com/itc/podcasts_connect/?lang=en#/itc9267a2f12 -->

<!-- Extensions: -->
<!-- https://github.com/josephw/feedvalidator/wiki/ExtensionNamespaces -->

<!-- Validators -->
<!-- https://podba.se/validate/ -->

<xsl:transform
  version="3.0"
  xmlns="http://backend.userland.com/rss2"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:date="http://exslt.org/dates-and-times"
  xmlns:hvml="http://vocab.nospoon.tv/ovml#"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:oembed="http://oembed.com/"
  xmlns:rawvoice="http://www.rawvoice.com/rawvoiceRssModule/"
  xmlns:str="http://exslt.org/strings"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:functx="http://www.functx.com"
  xmlns:util="https://api.hugh.today#util"
  exclude-result-prefixes="xhtml oembed xlink functx"
  extension-element-prefixes="str date"
>
  <xsl:output
    method="xml"
    indent="yes"
    omit-xml-declaration="no"
    cdata-section-elements="content:encoded"
  />

  <!-- Input Parameters -->
  <xsl:param name="imageUrl" />
  <xsl:param name="appleImageUrl" />
  <xsl:param name="imageTitle" />
  <xsl:param name="lastBuildDate" />
  <xsl:param name="secondaryCategory" />
  <xsl:param name="tertiaryCategory" />

  <!-- Global Variables -->
  <xsl:variable name="root" select="/hvml:hvml" />
  <xsl:variable name="series" select="$root/hvml:group[@type='series'][1]" />
  <xsl:variable name="producer" select="$series/hvml:producer[1]/hvml:entity[1]" />
  <xsl:variable name="author">
    <xsl:choose>
      <xsl:when test="$producer/hvml:name/hvml:given-name">
        <xsl:value-of select="concat($producer/hvml:name/hvml:given-name, ' ', $producer/hvml:name/hvml:family-name)" />
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$producer/hvml:name" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="link" select="$producer/hvml:uri[1]" />
  <xsl:variable name="api-link">
    <xsl:value-of select="concat( substring-before($link, '//'), '//api.', substring-after($link, '//') )" />
  </xsl:variable>
  <xsl:variable name="description">
    <xsl:choose>
      <xsl:when test="$series/hvml:description[@type='xhtml'][1]">
        <!-- <xsl:variable -->
        <xsl:for-each select="$series/hvml:description[@type='xhtml'][1]/xhtml:div/xhtml:*">
          <xsl:value-of select="." />
          <xsl:if test="position() != last()">
            <xsl:text xml:space="preserve"> </xsl:text>
          </xsl:if>
        </xsl:for-each>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$series/hvml:description[1]" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <!-- Functions -->
  <xsl:function name="functx:max-node" as="node()*">
    <xsl:param name="nodes" as="node()*" />
    <xsl:sequence select="$nodes[. = max($nodes)]" />
  </xsl:function>

  <!-- Function Templates -->
  <!-- Modified from: https://stackoverflow.com/a/35773037/214325 -->
  <xsl:template name="dateTime-to-RFC-2822">
    <xsl:param name="dateTime" />
    <!-- extract components -->
    <xsl:variable name="year" select="number(substring($dateTime, 1, 4))" />
    <xsl:variable name="month" select="number(substring($dateTime, 6, 2))" />
    <xsl:variable name="day" select="number(substring($dateTime, 9, 2))" />
    <!-- calculate day-of-week using Zeller's_congruence -->
    <xsl:variable name="a" select="number($month &lt; 3)" />
    <xsl:variable name="m" select="$month + 12*$a" />
    <xsl:variable name="y" select="$year - $a" />
    <xsl:variable name="K" select="$y mod 100" />
    <xsl:variable name="J" select="floor($y div 100)" />
    <xsl:variable name="h" select="($day + floor(13*($m + 1) div 5) + $K + floor($K div 4) + floor($J div 4) + 5*$J + 6) mod 7" />
    <!-- construct output -->
    <xsl:value-of select="substring('SunMonTueWedThuFriSat', 3 * $h + 1, 3)" />
    <xsl:text xml:space="preserve">, </xsl:text>
    <xsl:value-of select="$day" />
    <xsl:text xml:space="preserve"> </xsl:text>
    <xsl:value-of select="substring('JanFebMarAprMayJunJulAugSepOctNovDec', 3 * ($month - 1) + 1, 3)" />
    <xsl:text xml:space="preserve"> </xsl:text>
    <xsl:value-of select="$year" />
    <xsl:text xml:space="preserve"> </xsl:text>
    <xsl:value-of select="substring-before(substring-after($dateTime, 'T'), '.')" />
    <!-- <xsl:text xml:space="preserve"> GMT</xsl:text> -->
    <xsl:text xml:space="preserve"> +0000</xsl:text>
  </xsl:template>

  <xsl:template name="set-apple-image">
    <itunes:image>
      <xsl:attribute name="href">
        <xsl:choose>
          <xsl:when test="normalize-space($appleImageUrl) != ''">
            <xsl:value-of select="$appleImageUrl" />
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="$imageUrl" />
          </xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </itunes:image>
  </xsl:template>

  <xsl:template name="get-most-used-category">
    <xsl:variable name="counts" as="item()*">
      <util:categories>
        <util:personal><xsl:value-of select="count($series//hvml:video[@type='personal'])" /></util:personal>
        <util:narrative><xsl:value-of select="count($series//hvml:video[@type='short' or @type='feature'])" /></util:narrative>
        <!-- <util:ads><xsl:value-of select="count($series//hvml:video[@type='ad'])" /></util:ads> -->
        <util:historical><xsl:value-of select="count($series//hvml:video[@type='historical'])" /></util:historical>
      </util:categories>
    </xsl:variable>
    <xsl:value-of select="local-name(functx:max-node( $counts//* ))" />
  </xsl:template>

  <xsl:template name="set-primary-category">
    <xsl:variable name="most-used-category">
      <xsl:call-template name="get-most-used-category" />
    </xsl:variable>
    <xsl:choose>
      <xsl:when test="$most-used-category = 'personal'">
        <itunes:category text="Society &amp; Culture">
          <itunes:category text="Personal Journals" />
        </itunes:category>
      </xsl:when>
      <xsl:when test="$most-used-category = 'narrative'">
        <itunes:category text="TV &amp; Film" />
      </xsl:when>
      <!-- <xsl:when test="$most-used-category = 'ads'"></xsl:when> -->
      <xsl:when test="$most-used-category = 'historical'">
        <itunes:category text="News &amp; Politics" />
      </xsl:when>
    </xsl:choose>
  </xsl:template>

  <!--
    @todo: Take in a serialized string
    Input:
      "Business, Technology > Tech News"
    Outputs:
      <itunes:category text="Business" />
      <itunes:category text="Technology">
        <itunes:category text="Tech News" />
      </itunes:category>
  -->
  <xsl:template name="set-additional-categories">
    <itunes:category>
      <xsl:attribute name="text">
        <xsl:value-of select="$secondaryCategory" />
      </xsl:attribute>
    </itunes:category>
    <itunes:category>
      <xsl:attribute name="text">
        <xsl:value-of select="$tertiaryCategory" />
      </xsl:attribute>
    </itunes:category>
  </xsl:template>

  <xsl:template name="get-guid">
    <xsl:param name="recorded" />
    <xsl:choose>
      <xsl:when test="contains($recorded, 'T')">
        <xsl:value-of select="substring-before($recorded, 'T')" />
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$recorded" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Element Templates -->
  <xsl:template match="/">
    <rss version="2.0">
      <xsl:apply-templates select="hvml:hvml/hvml:group[@type='series'][1]" />
    </rss>
  </xsl:template>

  <xsl:template match="hvml:group[@type='series'][1]">
    <channel>
      <!-- <xsl:apply-templates select="hvml:title" /> -->
      <title><xsl:value-of select="hvml:title" /></title>
      <link><xsl:value-of select="$link" /></link>
      <image>
        <url><xsl:value-of select="$imageUrl" /></url>
        <title><xsl:value-of select="$imageTitle" /></title>
        <link><xsl:value-of select="$link" /></link>
      </image>
      <description><xsl:value-of select="$description" /></description>
      <language><xsl:value-of select="ancestor::hvml:hvml/@xml:lang" /></language>
      <copyright><xsl:value-of select="hvml:copyright/hvml:text" /></copyright>
      <atom:link rel="self" type="applicatoin/rss+xml">
        <xsl:attribute name="href">
          <xsl:value-of select="concat($api-link, '/feed/podcast')" />
        </xsl:attribute>
      </atom:link>
      <lastBuildDate>
        <xsl:call-template name="dateTime-to-RFC-2822">
          <xsl:with-param name="dateTime" select="$lastBuildDate" />
        </xsl:call-template>
      </lastBuildDate>
      <itunes:author><xsl:value-of select="$author" /></itunes:author>
      <itunes:summary><xsl:value-of select="substring($description, 1, 4000)" /></itunes:summary>
      <itunes:subtitle><xsl:value-of select="hvml:tagline" /></itunes:subtitle>
      <xsl:apply-templates select="hvml:producer" />
      <itunes:explicit>no</itunes:explicit>
      <itunes:keywords>startup,vlog,video blog</itunes:keywords>
      <xsl:call-template name="set-apple-image" />
      <rawvoice:rating>TV-MA</rawvoice:rating>
      <!-- <rawvoice:location>Boston, Massachusetts</rawvoice:location> -->
      <rawvoice:frequency>Daily</rawvoice:frequency>
      <xsl:call-template name="set-primary-category" />
      <xsl:call-template name="set-additional-categories" />
      <pubDate>
        <xsl:apply-templates select="hvml:group[@type='series']/hvml:video[hvml:published]/hvml:published">
          <xsl:sort select="." data-type="text" order="descending" />
        </xsl:apply-templates>
      </pubDate>
      <xsl:apply-templates select="hvml:group[@type='series']/hvml:video" />
    </channel>
  </xsl:template>

  <!-- <xsl:template match="hvml:title">
    <xsl:if test="normalize-space(text()) != ''">
      <title><xsl:value-of select="text()" /></title>
    </xsl:if>
  </xsl:template> -->

  <xsl:template match="hvml:published">
    <xsl:if test="position() = 1">
      <xsl:call-template name="dateTime-to-RFC-2822">
        <xsl:with-param name="dateTime" select="." />
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

  <xsl:template match="hvml:producer">
    <itunes:owner>
      <itunes:name><xsl:value-of select="$author" /></itunes:name>
      <itunes:email><xsl:value-of select="hvml:entity/hvml:email" /></itunes:email>
    </itunes:owner>
  </xsl:template>

  <xsl:template name="get-text-description">
    <xsl:choose>
      <xsl:when test="hvml:description">
        <xsl:apply-templates select="hvml:description[1]" />
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="hvml:showing[1]//hvml:description[1]" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="hvml:description">
    <!-- <xsl:text disable-output-escaping="yes">
    dkslfsd;lfksd;lfksd</xsl:text> -->
    <!-- <xsl:value-of select="." /> -->
    <xsl:for-each select="xhtml:div/xhtml:*">
      <xsl:variable name="title" select="./ancestor::hvml:video/hvml:title" />
      <xsl:choose>
        <xsl:when test="./text() = concat('“', $title, '”')"></xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="." />
        </xsl:otherwise>
      </xsl:choose>
      <xsl:text xml:space="preserve"> </xsl:text>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="hvml:description[@type='xhtml']/xhtml:div">
    <xsl:text disable-output-escaping="yes">&lt;![CDATA[</xsl:text>
    <xsl:for-each select="xhtml:*">
      <xsl:element name="{local-name()}">
        <xsl:apply-templates select="@* | node()" />
      </xsl:element>
    </xsl:for-each>
    <xsl:text disable-output-escaping="yes">]]</xsl:text>
    <xsl:text disable-output-escaping="yes">&gt;</xsl:text>
  </xsl:template>
  <xsl:template match="@*">
    <xsl:attribute name="{local-name()}">
      <xsl:value-of select="." />
    </xsl:attribute>
  </xsl:template>
  <xsl:template match="node()">
    <xsl:element name="{local-name()}">
      <xsl:apply-templates select="@* | node()" />
    </xsl:element>
  </xsl:template>
  <xsl:template match="comment() | text() | processing-instruction()">
    <xsl:copy />
  </xsl:template>

  <xsl:template match="hvml:video">
    <xsl:for-each select=".">
      <item>
        <guid>
          <xsl:call-template name="get-guid">
            <xsl:with-param name="recorded" select="hvml:recorded" />
          </xsl:call-template>
        </guid>
        <title><xsl:value-of select="hvml:title" /></title>
        <link>
          <xsl:value-of select="concat($link, '/', hvml:recorded)" />
        </link>
        <pubDate>
          <xsl:call-template name="dateTime-to-RFC-2822">
            <xsl:with-param name="dateTime" select="hvml:published" />
          </xsl:call-template>
        </pubDate>
        <description>
          <xsl:call-template name="get-text-description" />
        </description>
        <itunes:summary>
          <xsl:call-template name="get-text-description" />
        </itunes:summary>
        <!-- <content:encoded>
          <xsl:apply-templates select="hvml:description[@type='xhtml']/xhtml:div" />
        </content:encoded> -->
        <enclosure>
          <xsl:attribute name="url">
            <xsl:value-of select="hvml:presentation/hvml:file[.//hvml:container/hvml:mime[text() = 'video/mp4']][1]/@xlink:href" />
          </xsl:attribute>
          <xsl:attribute name="length">
            <xsl:value-of select="hvml:presentation/hvml:file[.//hvml:container/hvml:mime[text() = 'video/mp4']][1]/@length" />
          </xsl:attribute>
          <xsl:attribute name="type">
            <!-- video/mp4 -->
            <xsl:value-of select="hvml:presentation/hvml:file[.//hvml:container/hvml:mime[text() = 'video/mp4']][1]/hvml:container[1]/hvml:mime[1]" />
          </xsl:attribute>
        </enclosure>
      </item>
    </xsl:for-each>
  </xsl:template>
</xsl:transform>
