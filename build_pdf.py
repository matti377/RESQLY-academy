"""build_pdf.py — Erzeugt das Studierenden-Skript „EKG ++" im Design der Website."""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, KeepTogether,
                                PageBreak, Flowable)
from reportlab.platypus.tableofcontents import TableOfContents

from ekgdraw import (Strip, LeadGrid, BeatDetail, Cabrera, tpl, axis_leads,
                     INK, MUTED, BRAND, BRAND_DK, VIOLET, VIOLET_DK, VIOLET_LT,
                     HEART, HEART_DK, GOLD, GOLD_DK, GOLD_LT, OK, OK_DK, OK_LT,
                     BAD, BAD_DK, BAD_LT, LINE, LINE_SOFT, DARK_BG,
                     SCOPE_TRC, PAPER_BOLD)

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, 'skript-fonts')

# ------------------------------------------------------------------ Fonts

for name, f in [('Nunito', 'Nunito-400.ttf'), ('Nunito-Bold', 'Nunito-700.ttf'),
                ('Nunito-XBold', 'Nunito-800.ttf'), ('Nunito-Black', 'Nunito-900.ttf')]:
    pdfmetrics.registerFont(TTFont(name, os.path.join(FONTS, f)))
pdfmetrics.registerFontFamily('Nunito', normal='Nunito', bold='Nunito-Bold',
                              italic='Nunito', boldItalic='Nunito-Bold')

PAGE_W, PAGE_H = A4
ML, MR = 46, 46
MT, MB = 62, 56
CW = PAGE_W - ML - MR

# ----------------------------------------------------------------- Styles

def _st(name, **kw):
    base = dict(fontName='Nunito', fontSize=9.8, leading=15.2, textColor=INK,
                alignment=TA_LEFT, spaceBefore=0, spaceAfter=0)
    base.update(kw)
    return ParagraphStyle(name, **base)

S = {
    'h1':     _st('h1', fontName='Nunito-Black', fontSize=21, leading=25,
                  spaceBefore=0, spaceAfter=3),
    'h1sub':  _st('h1sub', fontSize=10.5, leading=15, textColor=MUTED,
                  spaceAfter=16),
    'h2':     _st('h2', fontName='Nunito-Black', fontSize=14, leading=18,
                  spaceBefore=17, spaceAfter=7),
    'h3':     _st('h3', fontName='Nunito-XBold', fontSize=11, leading=15,
                  textColor=BRAND_DK, spaceBefore=12, spaceAfter=5),
    'body':   _st('body', spaceAfter=8),
    'lead':   _st('lead', fontSize=10.6, leading=16.4, spaceAfter=10),
    'bullet': _st('bullet', fontSize=9.6, leading=14.4),
    'blabel': _st('blabel', fontName='Nunito-Black', fontSize=9.6, leading=14.4,
                  textColor=BRAND_DK),
    'boxh':   _st('boxh', fontName='Nunito-Black', fontSize=8, leading=11,
                  textColor=VIOLET_DK),
    'boxp':   _st('boxp', fontName='Nunito-Bold', fontSize=9.5, leading=14.4),
    'cap':    _st('cap', fontSize=8.4, leading=12, textColor=MUTED,
                  spaceBefore=4, spaceAfter=10),
    'th':     _st('th', fontName='Nunito-Black', fontSize=8, leading=11,
                  textColor=MUTED),
    'td':     _st('td', fontSize=9.2, leading=13.4),
    'tdb':    _st('tdb', fontName='Nunito-Black', fontSize=9.2, leading=13.4),
    'toc1':   _st('toc1', fontName='Nunito-Black', fontSize=11, leading=20),
    'toc2':   _st('toc2', fontSize=9.6, leading=16, leftIndent=14,
                  textColor=HexColor('#40506e')),
}

BOX_COLS = {
    'key':  (VIOLET_LT, HexColor('#ddd4ff'), VIOLET_DK),
    'warn': (GOLD_LT,   HexColor('#ffe4a3'), GOLD_DK),
    'bad':  (BAD_LT,    HexColor('#ffc3c3'), BAD_DK),
    'ok':   (OK_LT,     HexColor('#b6ebc4'), OK_DK),
}


_MISSING_GLYPHS = set()


def esc(t):
    # Zeichen, die Nunito nicht kennt, verschwinden im PDF spurlos —
    # deshalb hier mitschreiben und am Ende des Laufs melden.
    face = pdfmetrics.getFont('Nunito').face
    for ch in t:
        if ord(ch) > 127 and not face.charToGlyph.get(ord(ch)):
            _MISSING_GLYPHS.add(ch)
    return t.replace('&', '&amp;')


def hx(c):
    """reportlab-Farbe als '#rrggbb' fuer <font color=...>."""
    return '#' + c.hexval()[2:]


# -------------------------------------------------------------- Bausteine

class Rule(Flowable):
    def __init__(self, w, colour=LINE, thick=1.4, pad=0):
        Flowable.__init__(self)
        self.width, self.height = w, thick + pad
        self.colour, self.thick = colour, thick

    def wrap(self, aw, ah):
        return (self.width, self.height)

    def draw(self):
        self.canv.setStrokeColor(self.colour)
        self.canv.setLineWidth(self.thick)
        self.canv.line(0, self.height / 2, self.width, self.height / 2)


class ChapterBanner(Flowable):
    """Farbiger Kopf am Kapitelanfang — wie die Einheiten auf der Website."""

    def __init__(self, w, number, title, subtitle, colour):
        Flowable.__init__(self)
        self.width, self.height = w, 62
        self.number, self.title, self.subtitle, self.colour = \
            number, title, subtitle, colour

    def wrap(self, aw, ah):
        return (self.width, self.height)

    def draw(self):
        c = self.canv
        w, h = self.width, self.height
        c.setFillColor(self.colour)
        c.roundRect(0, 0, w, h, 14, stroke=0, fill=1)
        c.setFillColor(Color(1, 1, 1, 0.22))
        c.roundRect(12, 12, 38, 38, 11, stroke=0, fill=1)
        c.setFillColor(HexColor('#ffffff'))
        c.setFont('Nunito-Black', 21)
        c.drawCentredString(31, 24, str(self.number))
        c.setFont('Nunito-Black', 16)
        c.drawString(62, 33, self.title)
        c.setFont('Nunito', 9.6)
        c.setFillColor(Color(1, 1, 1, 0.82))
        c.drawString(62, 18, self.subtitle)


def box(kind, title, text, width=CW):
    bg, br, fg = BOX_COLS[kind]
    inner = []
    if title:
        inner.append(Paragraph(esc(title).upper(), ParagraphStyle(
            'bh', parent=S['boxh'], textColor=fg)))
        inner.append(Spacer(1, 3))
    inner.append(Paragraph(esc(text), S['boxp']))
    t = Table([[inner]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('BOX', (0, 0), (-1, -1), 1.2, br),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 11),
    ]))
    return t


def bullets(items, width=CW, colour=BRAND_DK):
    """Liste mit farbigem Marker links — wie die Aufzählungen auf der Website."""
    rows = []
    for label, text in items:
        if label:
            body = ('<font name="Nunito-Black" color="%s">%s</font> %s'
                    % (hx(colour), esc(label), esc(text)))
        else:
            body = esc(text)
        dot = Table([['']], colWidths=[7], rowHeights=[7])
        dot.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colour),
            ('ROUNDEDCORNERS', [3.5, 3.5, 3.5, 3.5]),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        rows.append([dot, Paragraph(body, S['bullet'])])
    t = Table(rows, colWidths=[16, width - 16])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (0, -1), 1),
        ('TOPPADDING', (0, 0), (0, -1), 8),
        ('LEFTPADDING', (1, 0), (1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return t


def table(headers, rows, widths=None, width=CW):
    data = [[Paragraph(esc(h).upper(), S['th']) for h in headers]]
    for r in rows:
        data.append([Paragraph(esc(c), S['tdb'] if i == 0 else S['td'])
                     for i, c in enumerate(r)])
    if widths is None:
        widths = [width / float(len(headers))] * len(headers)
    t = Table(data, colWidths=widths, repeatRows=1)
    style = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, 0), 1.2, LINE),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
    ]
    for i in range(1, len(data)):
        if i % 2 == 1:
            style.append(('BACKGROUND', (0, i), (-1, i), LINE_SOFT))
        if i < len(data) - 1:
            style.append(('LINEBELOW', (0, i), (-1, i), 0.6, LINE))
    t.setStyle(TableStyle(style))
    return t


def caption(text):
    return Paragraph('<font name="Nunito-Black">Abb.</font> ' + esc(text), S['cap'])


def h2(text):
    return Paragraph(esc(text), S['h2'])


def h3(text):
    return Paragraph(esc(text), S['h3'])


def p(text):
    return Paragraph(esc(text), S['body'])


def lead(text):
    return Paragraph(esc(text), S['lead'])


# ------------------------------------------------------------ Seitenrahmen

class Doc(BaseDocTemplate):
    def __init__(self, path, **kw):
        BaseDocTemplate.__init__(self, path, pagesize=A4,
                                 leftMargin=ML, rightMargin=MR,
                                 topMargin=MT, bottomMargin=MB, **kw)
        frame = Frame(ML, MB, CW, PAGE_H - MT - MB, id='body',
                      leftPadding=0, rightPadding=0,
                      topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id='cover', frames=[frame], onPage=self._cover),
            PageTemplate(id='content', frames=[frame], onPage=self._furniture),
        ])
        self.chapter = ''

    # Laufender Kopf und Fuß
    def _furniture(self, c, doc):
        c.saveState()
        c.setFont('Nunito-Black', 8)
        c.setFillColor(HEART)
        c.drawString(ML, PAGE_H - 40, 'EKG ++')
        if self.chapter:
            c.setFont('Nunito', 8)
            c.setFillColor(MUTED)
            c.drawString(ML + 40, PAGE_H - 40, self.chapter)
        c.setStrokeColor(LINE)
        c.setLineWidth(1)
        c.line(ML, PAGE_H - 48, PAGE_W - MR, PAGE_H - 48)

        c.setLineWidth(1)
        c.line(ML, MB - 18, PAGE_W - MR, MB - 18)
        c.setFont('Nunito', 7.6)
        c.setFillColor(MUTED)
        c.drawString(ML, MB - 30, 'Lernskript — ersetzt keine ärztliche Beurteilung')
        c.setFont('Nunito-Black', 9)
        c.setFillColor(INK)
        c.drawRightString(PAGE_W - MR, MB - 30, str(doc.page))
        c.restoreState()

    def _cover(self, c, doc):
        pass

    def beforeDocument(self):
        # multiBuild läuft mehrfach; ohne Reset schleppt der Kolumnentitel
        # das letzte Kapitel des vorigen Durchlaufs auf die ersten Seiten.
        self.chapter = ''

    def afterFlowable(self, flowable):
        if hasattr(flowable, '_toc'):
            level, text = flowable._toc
            self.notify('TOCEntry', (level, text, self.page))
            if level == 0:
                self.chapter = text


def toc_entry(flowable, level, text):
    flowable._toc = (level, text)
    return flowable


# ------------------------------------------------------------------ Inhalt

def cover_flowables():
    """Titelseite im Stil des Website-Headers."""

    class Hero(Flowable):
        def __init__(self, w, h):
            Flowable.__init__(self)
            self.width, self.height = w, h

        def wrap(self, aw, ah):
            return (self.width, self.height)

        def draw(self):
            c = self.canv
            w, h = self.width, self.height
            c.setFillColor(DARK_BG)
            c.roundRect(0, 0, w, h, 20, stroke=0, fill=1)

            c.setFillColor(HexColor('#ffffff'))
            c.setFont('Nunito-Black', 40)
            c.drawString(30, h - 74, 'EKG ++')
            c.setFillColor(HexColor('#b7cbdd'))
            c.setFont('Nunito', 12.5)
            c.drawString(30, h - 96, 'Vom ersten Ausschlag bis zum Infarkt-EKG')

            c.setFillColor(HEART)
            c.roundRect(30, h - 128, 128, 20, 10, stroke=0, fill=1)
            c.setFillColor(HexColor('#ffffff'))
            c.setFont('Nunito-Black', 9)
            c.drawCentredString(94, h - 122, 'KURSSKRIPT')

            strip = Strip(w - 60, 92, tpl({}), theme='monitor',
                          seconds=4.4, rate=72, mv_top=1.9, mv_bot=-1.3,
                          radius=10)
            strip.canv = c
            c.saveState()
            c.translate(30, 34)
            strip.draw()
            c.restoreState()

    out = [Spacer(1, 26), Hero(CW, 300), Spacer(1, 30)]
    out.append(Paragraph(
        'Dieses Skript begleitet den interaktiven EKG-Kurs. Es folgt demselben '
        'Aufbau wie die Website: erst die Bausteine der Kurve, dann Rhythmus '
        'und Blockbilder, danach Ischämie, Sonderfälle und Medikamente.', S['lead']))
    out.append(Spacer(1, 6))
    out.append(box('key', 'So arbeitest du damit',
                   'Lies ein Kapitel, sieh dir die Abbildungen genau an — und übe '
                   'dann dieselben Befunde auf der Website. Wiedererkennen lernt '
                   'man nur am Bild, nicht am Text.'))
    out.append(Spacer(1, 14))
    out.append(box('warn', 'Wichtiger Hinweis',
                   'Dieses Skript dient dem Lernen. Es ersetzt weder Ausbildung noch '
                   'Leitlinie noch ärztliche Beurteilung. Alle EKG-Abbildungen sind '
                   'rechnerisch erzeugt und damit idealisiert — ein echtes '
                   'Patienten-EKG ist unruhiger und vielgestaltiger.'))
    out.append(PageBreak())
    return out


def build_toc():
    toc = TableOfContents()
    toc.levelStyles = [S['toc1'], S['toc2']]
    return [Paragraph('Inhalt', S['h1']),
            Paragraph('Fünf Kapitel, ein roter Faden.', S['h1sub']),
            toc, PageBreak()]


def chapter(n, title, subtitle, colour):
    b = ChapterBanner(CW, n, title, subtitle, colour)
    return [toc_entry(b, 0, '%d  %s' % (n, title)), Spacer(1, 16)]


def sec(title):
    return toc_entry(h2(title), 1, title)


# =====================================================================
#  KAPITEL 1 — GRUNDLAGEN
# =====================================================================

def kapitel1():
    o = []
    o += chapter(1, 'Grundlagen', 'Was die Kurve überhaupt zeigt', BRAND)

    o.append(lead(
        'Das EKG zeichnet die elektrischen Ströme auf, die bei jeder Herzaktion '
        'durch den Körper laufen. Es zeigt also, <b>wie das Herz erregt wird</b> — '
        'nicht, wie gut es pumpt. Diese Unterscheidung trägt durch das ganze Skript.'))

    o.append(sec('1.1 Drei Begriffe vorweg'))
    o.append(bullets([
        ('Physiologisch —', 'anatomisch normal, gesund.'),
        ('Pathologisch —', 'krankhaft.'),
        ('Vektor —', 'Richtung und Stärke der elektrischen Erregung. Jede Ableitung '
                     'misst nur den Anteil dieses Vektors, der auf sie zuläuft. '
                     'Genau deshalb sieht derselbe Herzschlag in jeder Ableitung anders aus.'),
    ]))

    o.append(sec('1.2 Was die einzelnen Abschnitte bedeuten'))
    o.append(Spacer(1, 2))
    o.append(BeatDetail(CW, 168, zones=('p', 'qrs', 't')))
    o.append(caption('1 — Ein vollständiger Herzzyklus mit den drei Grundbausteinen.'))
    o.append(table(
        ['Abschnitt', 'Bedeutung'],
        [['P-Welle', 'Erregungsausbreitung in den Vorhöfen'],
         ['PQ-Zeit', 'Überleitung vom Vorhof auf die Kammer (AV-Intervall)'],
         ['QRS-Komplex', 'Erregungsausbreitung in den Kammern'],
         ['ST-Strecke', 'Beginn der Erregungsrückbildung der Kammern'],
         ['T-Welle', 'Ende der Erregungsrückbildung der Kammern'],
         ['QT-Zeit', 'Gesamte Kammeraktion — Erregung und Rückbildung zusammen']],
        widths=[110, CW - 110]))
    o.append(Spacer(1, 10))
    o.append(box('key', 'Warum es keine Vorhof-T-Welle gibt',
                 'Auch die Vorhöfe bilden ihre Erregung zurück. Das geschieht aber '
                 'zeitgleich mit dem viel größeren QRS-Komplex und geht darin unter. '
                 'Sichtbar wird es nur in Ausnahmefällen, etwa beim AV-Block III°.'))

    o.append(sec('1.3 Zacken benennen'))
    o.append(p('Der QRS-Komplex sieht nicht in jeder Ableitung gleich aus. Damit '
               'trotzdem alle dasselbe meinen, gibt es eine feste Benennung. Sie '
               'richtet sich allein danach, <b>ob</b> ein Ausschlag nach oben oder '
               'unten geht — und <b>wann</b> er kommt.'))
    o.append(bullets([
        ('R-Zacke —', 'jeder Ausschlag nach oben (positiv).'),
        ('Q-Zacke —', 'ein Ausschlag nach unten <b>vor</b> der ersten R-Zacke.'),
        ('S-Zacke —', 'ein Ausschlag nach unten <b>nach</b> einer R-Zacke.'),
        ('Groß oder klein —', 'Großbuchstaben für kräftige Ausschläge (ab etwa 5 mm), '
                              'Kleinbuchstaben für kleine. Aus „kleines q, großes R, '
                              'kleines s" wird <b>qRs</b>.'),
        ('QS-Komplex —', 'ein einziger, komplett negativer Ausschlag ohne jede positive Zacke.'),
        ('R-Strich (R’) —', 'eine zweite positive Zacke. Das <b>rSR’</b> in V1 '
                                 'ist das Erkennungszeichen des Rechtsschenkelblocks.'),
    ]))
    o.append(Spacer(1, 8))
    o.append(LeadGrid(CW, [
        ('qRs', {'q': {'a': -0.12}, 'r': {'a': 1.40}, 's': {'a': -0.22}, 't': {'a': 0.30}}),
        ('Rs', {'q': {'a': 0}, 'r': {'a': 1.50}, 's': {'a': -0.20}, 't': {'a': 0.30}}),
        ('rS', {'q': {'a': 0}, 'r': {'a': 0.22}, 's': {'a': -1.35}, 't': {'a': 0.22}}),
        ('QS', {'q': {'c': 0.048, 'w': 0.032, 'a': -1.45}, 'r': {'a': 0}, 's': {'a': 0}, 't': {'a': 0.24}}),
        ('rSR’', {'q': {'a': 0}, 'r': {'c': 0.026, 'w': 0.013, 'a': 0.45},
                       's': {'c': 0.056, 'w': 0.013, 'a': -0.42},
                       'r2': {'c': 0.096, 'w': 0.021, 'a': 1.05},
                       't': {'c': 0.285, 'a': -0.26}, 'stEnd': 0.225}),
        ('QR', {'q': {'c': 0.016, 'w': 0.016, 'a': -0.62}, 'r': {'c': 0.048, 'w': 0.014, 'a': 1.10},
                's': {'a': 0}, 't': {'a': 0.26}}),
    ]))
    o.append(caption('2 — Dieselbe Systematik, sechs verschiedene Formen.'))

    o.append(sec('1.4 Die P-Welle'))
    o.append(bullets([
        ('Form —', 'halbrund, glatt und positiv.'),
        ('Dauer —', 'bis etwa 0,10 s (50–100 ms).'),
        ('Amplitude —', 'unter 0,25 mV.'),
        ('Am besten beurteilbar —', 'in Ableitung II.'),
        ('Normale Ausnahmen —', 'In <b>aVR</b> ist die P-Welle regelhaft negativ. In '
                                '<b>V1</b> ist sie oft biphasisch oder negativ; '
                                'dasselbe gilt, wenn der zugehörige QRS-Komplex '
                                'überwiegend negativ ist.'),
    ]))
    o.append(Spacer(1, 6))
    o.append(h3('Wodurch sich die P-Welle verändert'))
    o.append(bullets([
        ('Vorhofleitungsstörung —', 'bei Erkrankung des Vorhofmyokards, etwa durch '
                                    'Ischämie oder Entzündung.'),
        ('Ektoper Vorhofrhythmus —', 'die Erregung entsteht nicht im Sinusknoten, '
                                     'sondern an anderer Stelle im Vorhof.'),
        ('Retrograde Vorhoferregung —', 'der Ursprung liegt im AV-Knoten oder His-Bündel; '
                                        'die Vorhöfe werden von unten nach oben erregt. '
                                        'Die P-Welle wird dadurch negativ und kann hinter '
                                        'dem QRS-Komplex liegen.'),
    ], colour=HEART_DK))

    o.append(sec('1.5 Die PQ-Zeit'))
    o.append(p('Die PQ-Zeit umfasst die Überleitung vom Vorhof auf die Kammer. '
               'Gemessen wird vom <b>Beginn der P-Welle bis zum Beginn des '
               'QRS-Komplexes</b> — und zwar in der Ableitung mit der besten '
               'Abgrenzung und der längsten PQ-Zeit, meist Ableitung II.'))
    o.append(box('key', 'Normwert', 'Die PQ-Zeit beträgt <b>120–200 ms</b>.'))
    o.append(Spacer(1, 12))
    o.append(h3('Verlängerte PQ-Zeit (über 200 ms)'))
    o.append(bullets([
        ('AV-Block I° —', 'Leitungsverzögerung im AV-Knoten; jede P-Welle wird '
                          'übergeleitet, nur später.'),
        ('AV-Block II° —', 'die Überleitung gelingt nur noch teilweise, einzelne '
                           'QRS-Komplexe fallen aus.'),
        ('AV-Block III° —', 'die Überleitung ist komplett unterbrochen.'),
    ], colour=GOLD_DK))
    o.append(Spacer(1, 8))
    o.append(h3('Verkürzte PQ-Zeit (unter 120 ms)'))
    o.append(bullets([
        ('Schnell leitender AV-Knoten —', 'ohne Krankheitswert.'),
        ('James-Bündel (LGL-Syndrom) —', 'die Bahn umgeht den AV-Knoten und mündet '
                                         'dahinter ins normale Leitungssystem. Folge: '
                                         'kurze PQ-Zeit, <b>keine</b> Delta-Welle, '
                                         'schmaler QRS-Komplex.'),
        ('Akzessorisches Bündel (WPW-Syndrom, Kent-Bündel) —',
         'die Bahn erreicht die Kammermuskulatur direkt. Folge: kurze PQ-Zeit '
         '<b>mit Delta-Welle</b> und verbreitertem QRS-Komplex.'),
    ], colour=VIOLET_DK))
    o.append(Spacer(1, 8))
    o.append(Strip(CW, 108, tpl({'q': {'a': 0}, 'd': {'c': 0.014, 'w': 0.021, 'a': 0.34},
                                 'r': {'c': 0.058, 'w': 0.014, 'a': 1.05},
                                 's': {'c': 0.086, 'w': 0.012, 'a': -0.20},
                                 't': {'c': 0.265, 'w': 0.062, 'a': -0.22},
                                 'stEnd': 0.215}),
                   pq=0.10, seconds=3.0, rate=72))
    o.append(caption('3 — WPW-Syndrom: kurze PQ-Zeit und träger Anstieg des QRS-Komplexes '
                     '(Delta-Welle).'))

    o.append(sec('1.6 Die Q-Zacke'))
    o.append(p('Die Erregung der Kammern beginnt in der <b>Kammerscheidewand</b>, und '
               'zwar von links nach rechts. Dieser erste kleine Vektor läuft von den '
               'linkslateralen Ableitungen weg und erzeugt dort eine kleine negative '
               'Zacke — die septale q-Zacke.'))
    o.append(bullets([
        ('Normal —', 'kleine, schmale q-Zacken in <b>I, aVL, V5 und V6</b>. Das sind '
                     'die septalen q-Zacken; sie gehören zum gesunden EKG.'),
        ('Pathologisch —', 'eine Q-Zacke ab <b>0,04 s Breite</b> <i>oder</i> tiefer als '
                           '<b>ein Viertel</b> der nachfolgenden R-Zacke. Ein Kriterium genügt.'),
        ('In V1 bis V3 —', 'ist praktisch jede Q-Zacke verdächtig. Ein reiner '
                           'QS-Komplex allein in V1 kann dagegen noch eine Normvariante sein.'),
        ('Pardee-Q —', 'so heißt das pathologische Q nach einem Infarkt. Es dokumentiert '
                       'die Narbe und bleibt oft <b>lebenslang</b> bestehen.'),
    ]))
    o.append(Spacer(1, 8))
    o.append(LeadGrid(CW, [
        ('q normal', {'q': {'c': 0.010, 'w': 0.008, 'a': -0.09}, 'r': {'a': 1.35},
                      's': {'a': -0.18}, 't': {'a': 0.30}}),
        ('Q pathologisch', {'q': {'c': 0.018, 'w': 0.018, 'a': -0.48},
                            'r': {'c': 0.052, 'w': 0.013, 'a': 0.90},
                            's': {'a': -0.10}, 't': {'a': 0.22}}),
        ('QS', {'q': {'c': 0.048, 'w': 0.032, 'a': -1.30}, 'r': {'a': 0}, 's': {'a': 0},
                't': {'a': -0.20}}),
    ], cell_h=86, mv_top=1.7, mv_bot=-1.7))
    o.append(caption('4 — Links das normale septale q, in der Mitte ein pathologisches Q, '
                     'rechts ein QS-Komplex ohne jede R-Zacke.'))
    o.append(box('key', 'Zwei Kästchen zählen genügt',
                 'Du brauchst kein Lineal: Ist die Q-Zacke breiter als ein kleines '
                 'Kästchen (bei 25 mm/s) <b>oder</b> tiefer als ein Viertel des '
                 'folgenden R, ist sie auffällig.'))

    o.append(h3('Nicht jedes Q ist ein Infarkt'))
    o.append(bullets([
        ('Falsch geklebte Elektroden —', 'zu hoch angebrachte Brustwandelektroden '
         'erzeugen Q-Zacken und fehlenden R-Aufbau. <b>Immer zuerst prüfen</b> — das ist '
         'die häufigste und die am schnellsten zu klärende Ursache.'),
        ('Linksschenkelblock —', 'der QS-Komplex in V1 bis V3 gehört zum Blockbild.'),
        ('WPW-Syndrom —', 'eine negative Delta-Welle kann eine Q-Zacke imitieren.'),
        ('Hypertrophe Kardiomyopathie —', 'das verdickte Septum erzeugt tiefe, aber '
         'typischerweise <i>schmale</i> Q-Zacken.'),
        ('Lungenembolie —', 'das SI-QIII-TIII-Muster bringt eine Q-Zacke in Ableitung III '
         'mit sich.'),
        ('Lagebedingt —', 'eine isolierte Q-Zacke nur in Ableitung III verschwindet oft '
         'bei tiefer Einatmung — dann ist sie harmlos.'),
    ], colour=GOLD_DK))
    return o


# =====================================================================
#  KAPITEL 1 — Fortsetzung
# =====================================================================

def kapitel1b():
    o = []
    o.append(sec('1.7 R- und S-Zacke: der R-Aufbau'))
    o.append(p('R- und S-Zacken sind normalerweise schmal, schlank und spitz. '
               'Wandert man mit den Elektroden von V1 nach V6 um den Brustkorb, dreht '
               'sich der Blickwinkel allmählich zur linken Kammer hin. Deshalb wächst '
               'die R-Zacke stetig an, während die S-Zacke flacher wird — der '
               '<b>R-Aufbau</b> oder die R-Progression.'))
    o.append(LeadGrid(CW, [(l, o2) for l, o2 in [
        ('V1', {'q': {'a': 0}, 'r': {'a': 0.16}, 's': {'a': -1.05}, 't': {'a': 0.14}}),
        ('V2', {'q': {'a': 0}, 'r': {'a': 0.40}, 's': {'a': -1.40}, 't': {'a': 0.48}}),
        ('V3', {'q': {'a': 0}, 'r': {'a': 0.80}, 's': {'a': -0.85}, 't': {'a': 0.44}}),
        ('V4', {'q': {'a': -0.04}, 'r': {'a': 1.35}, 's': {'a': -0.45}, 't': {'a': 0.38}}),
        ('V5', {'q': {'a': -0.07}, 'r': {'a': 1.55}, 's': {'a': -0.22}, 't': {'a': 0.32}}),
        ('V6', {'q': {'a': -0.09}, 'r': {'a': 1.25}, 's': {'a': -0.10}, 't': {'a': 0.26}}),
    ]]))
    o.append(caption('5 — Regelrechter R-Aufbau. Alle sechs Felder haben denselben '
                     'Maßstab — nur so ist das Wachstum ablesbar.'))
    o.append(bullets([
        ('R wächst —', 'von V1 bis etwa V5 kontinuierlich an. In V6 nimmt sie oft '
                       'wieder leicht ab; das ist normal.'),
        ('S wird flacher —', 'am tiefsten ist sie in V1 und V2.'),
        ('Umschlagzone —', 'dort, wo R und S gleich groß sind, kippt der Komplex von '
                           'überwiegend negativ nach überwiegend positiv. Normal liegt '
                           'sie in <b>V3 oder V4</b>.'),
    ]))
    o.append(Spacer(1, 8))
    o.append(box('key', 'Normwert QRS-Breite',
                 'Der QRS-Komplex dauert normal <b>60–100 ms</b>. Zwischen <b>100 und '
                 '120 ms</b> spricht man von einem inkompletten Block, ab <b>120 ms</b> '
                 'von einem kompletten Schenkelblock. Eine gestörte Erregungsausbreitung '
                 'zeigt sich immer an beidem: einer Verlängerung <i>und</i> einer '
                 'Deformierung des Komplexes.'))

    o.append(sec('1.8 Die ST-Strecke'))
    o.append(p('Die ST-Strecke markiert den Beginn der Erregungsrückbildung in den '
               'Kammern. In dieser Phase sind alle Kammerzellen erregt — es bestehen '
               'keine Spannungsunterschiede, die Strecke verläuft daher gerade auf der '
               'isoelektrischen Linie. Der Übergang vom QRS-Komplex zur ST-Strecke heißt '
               '<b>J-Punkt</b>; er ist der vereinbarte Messpunkt.'))
    o.append(box('ok', 'Aus der Praxis',
                 'LIFEPAK 15 und corpuls³ berechnen die Höhe des J-Punktes gegenüber der '
                 'isoelektrischen Linie automatisch. Verlassen sollte man sich darauf '
                 'nicht — aber als zweite Meinung ist der Wert nützlich.'))
    o.append(Spacer(1, 12))
    o.append(h3('ST-Hebung: die Form verrät die Ursache'))
    o.append(p('Entscheidend ist, aus welchem Teil des QRS-Komplexes die Hebung '
               '<i>herauswächst</i>.'))

    half = (CW - 12) / 2.0
    figs = Table([[
        Strip(half, 104, tpl({'s': {'a': -0.04}, 'st': 0.42, 'stEnd': 0.135,
                              't': {'c': 0.255, 'w': 0.070, 'a': 0.34}}),
              seconds=2.0, rate=88),
        Strip(half, 104, tpl({'s': {'c': 0.058, 'w': 0.012, 'a': -0.34},
                              'st': 0.15, 'stEnd': 0.205,
                              't': {'c': 0.270, 'w': 0.065, 'a': 0.26}}),
              seconds=2.0, rate=90),
    ], [
        Paragraph('<font name="Nunito-Black" color="%s">Aus dem absteigenden R:</font> '
                  'Infarkt (STEMI). Die Kurve erreicht die Nulllinie gar nicht erst.'
                  % hx(BAD_DK), S['bullet']),
        Paragraph('<font name="Nunito-Black" color="%s">Aus dem aufsteigenden S:</font> '
                  'Perikarditis. Die S-Zacke ist voll ausgebildet, die Hebung verläuft '
                  'konkav.' % hx(VIOLET_DK), S['bullet']),
    ]], colWidths=[half, half])
    figs.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (0, -1), 0), ('RIGHTPADDING', (0, 0), (0, -1), 6),
        ('LEFTPADDING', (1, 0), (1, -1), 6), ('RIGHTPADDING', (1, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 1), (-1, 1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 0),
    ]))
    o.append(figs)
    o.append(caption('6 — Derselbe Befund „ST-Hebung", zwei völlig verschiedene Ursachen.'))
    o.append(Spacer(1, 4))
    o.append(bullets([
        ('Zweites Unterscheidungsmerkmal —', 'Der Infarkt hebt in den Ableitungen '
         '<b>eines Gefäßgebiets</b>. Die Perikarditis hebt in <b>vielen Ableitungen '
         'gleichzeitig</b>, ohne sich an ein Versorgungsgebiet zu halten — oft '
         'zusätzlich mit einer PQ-Senkung.'),
    ], colour=HEART_DK))
    o.append(Spacer(1, 8))
    o.append(h3('ST-Senkung'))
    o.append(p('Unterschieden werden drei Formen: <b>aszendierend</b> (ansteigend), '
               '<b>deszendierend</b> (abfallend) und <b>horizontal</b>. Horizontale und '
               'deszendierende Senkungen sprechen am ehesten für eine Ischämie, '
               'aszendierende sind unspezifisch und oft frequenzbedingt.'))
    o.append(Spacer(1, 6))
    o.append(box('warn', 'Vorsicht bei Schenkelblock',
                 'Beim Linksschenkelblock und bei Schrittmacherstimulation gehören '
                 'ST-Senkungen und gegenläufige T-Wellen zum Bild. Sie dürfen dort '
                 '<b>nicht</b> als Ischämiezeichen gewertet werden. Um einen Infarkt '
                 'trotzdem zu erkennen, gibt es eigene Kriterien (nach Sgarbossa) — '
                 'im Zweifel entscheidet die Klinik.'))
    return o


def kapitel1c():
    o = []
    o.append(sec('1.9 Die T-Welle'))
    o.append(p('Die T-Welle zeigt das Ende der Erregungsrückbildung in den Kammern. '
               'Sie ist halbrund, glatt und positiv — und deutlich breiter und flacher '
               'als der QRS-Komplex.'))
    o.append(bullets([
        ('Konkordanz —', 'Die T-Welle zeigt normalerweise in dieselbe Richtung wie der '
                         'QRS-Komplex.'),
        ('Normale Ausnahmen —', 'In <b>V1</b> darf sie negativ sein, ebenso wenn der '
                                'zugehörige QRS-Komplex überwiegend negativ ist. In '
                                '<b>aVR</b> ist sie regelhaft negativ.'),
    ]))
    o.append(Spacer(1, 6))
    o.append(h3('Pathologische Veränderungen'))
    o.append(bullets([
        ('T-Abflachung —', 'unspezifisch; unter anderem bei Hypokaliämie.'),
        ('T-Negativierung —', 'Ischämiezeichen, auch im Verlauf nach einem Infarkt.'),
        ('Überhöhte T-Welle —', 'sehr früh im Infarktgeschehen („Erstickungs-T").'),
        ('Zeltförmige T-Welle —', 'hoch und spitz zulaufend — klassisch bei '
                                  '<b>Hyperkaliämie</b>.'),
    ], colour=HEART_DK))
    o.append(Spacer(1, 8))
    half = (CW - 12) / 2.0
    tt = Table([[
        Strip(half, 96, tpl({'t': {'c': 0.235, 'w': 0.030, 'a': 0.95}, 'r': {'w': 0.016}}),
              p_amp=0.04, seconds=2.1, rate=66, mv_top=1.6, mv_bot=-1.0),
        Strip(half, 96, tpl({'t': {'c': 0.245, 'w': 0.055, 'a': 0.07},
                             'u': {'c': 0.365, 'w': 0.050, 'a': 0.20}, 'st': -0.06}),
              seconds=2.1, rate=74, mv_top=1.6, mv_bot=-1.0),
    ], [
        Paragraph('<font name="Nunito-Black" color="%s">Zeltförmig:</font> Hyperkaliämie'
                  % hx(BAD_DK), S['bullet']),
        Paragraph('<font name="Nunito-Black" color="%s">Flach mit U-Welle:</font> '
                  'Hypokaliämie' % hx(VIOLET_DK), S['bullet']),
    ]], colWidths=[half, half])
    tt.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (0, -1), 0), ('RIGHTPADDING', (0, 0), (0, -1), 6),
        ('LEFTPADDING', (1, 0), (1, -1), 6), ('RIGHTPADDING', (1, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 1), (-1, 1), 6), ('BOTTOMPADDING', (0, 0), (-1, 0), 0),
    ]))
    o.append(tt)
    o.append(caption('7 — Die beiden Kalium-Bilder im direkten Vergleich.'))

    o.append(h3('Negative T-Wellen richtig einordnen'))
    o.append(p('Eine negative T-Welle ist einer der häufigsten Befunde — und einer '
               'der am schnellsten überbewerteten. Erst kommt die Frage, ob sie an '
               'dieser Stelle überhaupt auffällig ist.'))
    o.append(bullets([
        ('Immer normal —', 'in <b>aVR</b>. Diese Ableitung schaut entgegen der '
                           'Erregungsrichtung.'),
        ('Oft normal —', 'in <b>V1</b> (bei jungen Menschen auch V2) und in '
                         '<b>III</b>, wenn sie bei tiefer Einatmung verschwindet.'),
        ('Grundregel —', 'Die T-Welle folgt der Hauptrichtung des QRS-Komplexes. Ist '
                         'der QRS überwiegend negativ, darf das T es auch sein.'),
    ]))
    o.append(Spacer(1, 6))
    o.append(LeadGrid(CW, [
        ('aVR', {'q': {'c': 0.045, 'w': 0.028, 'a': -0.95}, 'r': {'a': 0}, 's': {'a': 0},
                 't': {'c': 0.245, 'w': 0.058, 'a': -0.30}}, -0.12),
        ('V1', {'q': {'a': 0}, 'r': {'a': 0.20}, 's': {'a': -1.00},
                't': {'c': 0.245, 'w': 0.055, 'a': -0.22}}, 0.05),
        ('III', {'q': {'a': 0}, 'r': {'a': 0.55}, 's': {'a': -0.28},
                 't': {'c': 0.245, 'w': 0.055, 'a': -0.20}}, 0.09),
    ], cell_h=84))
    o.append(caption('8 — Drei Ableitungen, in denen ein negatives T zum Normalbefund '
                     'gehört.'))
    o.append(bullets([
        ('Symmetrisch, tief, schmale Spitze —', 'spricht für eine <b>Ischämie</b>.'),
        ('Asymmetrisch, träge abfallend —', 'eher <b>sekundär</b>: Hypertrophie, '
                                            'Schenkelblock, Schrittmacher.'),
        ('Mehrere benachbarte Ableitungen —', 'wiegen schwerer als eine einzelne.'),
        ('Weitere Ursachen —', 'Lungenembolie (III und V1–V3, mit SI-QIII-TIII), '
                               'zerebrale Ereignisse, juveniles T-Muster, '
                               'vorübergehend nach Tachykardien.'),
    ], colour=HexColor('#c2410c')))
    o.append(Spacer(1, 8))
    o.append(box('bad', 'Wellens-Muster — kennen und nicht übersehen',
                 'Tief negative, <b>symmetrische</b> T-Wellen in <b>V2 und V3</b> bei '
                 '<b>erhaltenen R-Zacken</b>, ohne pathologische Q-Zacken und ohne '
                 'nennenswerte ST-Hebung. Das steht für eine hochgradige '
                 '<b>RIVA-Stenose</b> und zeigt sich typischerweise im '
                 '<b>schmerzfreien Intervall</b>. Die Betroffenen wirken unauffällig, '
                 'das Troponin ist oft normal — das EKG ist der einzige Hinweis. '
                 'Ein Belastungstest wäre hier gefährlich.'))
    o.append(Spacer(1, 10))
    o.append(LeadGrid(CW, [
        ('V1', {'q': {'a': 0}, 'r': {'a': 0.22}, 's': {'a': -0.85},
                't': {'c': 0.248, 'w': 0.055, 'a': -0.20}}),
        ('V2', {'q': {'a': 0}, 'r': {'a': 0.55}, 's': {'a': -0.70},
                't': {'c': 0.252, 'w': 0.062, 'a': -0.78}}),
        ('V3', {'q': {'a': 0}, 'r': {'a': 0.90}, 's': {'a': -0.45},
                't': {'c': 0.252, 'w': 0.062, 'a': -0.82}}),
        ('V4', {'q': {'a': -0.04}, 'r': {'a': 1.25}, 's': {'a': -0.30},
                't': {'c': 0.250, 'w': 0.060, 'a': -0.40}}),
    ], cell_h=84, cols=2))
    o.append(caption('9 — Wellens Typ B: tiefe symmetrische T-Negativierung in V2/V3, '
                     'R-Zacken erhalten.'))
    o.append(box('key', 'Der wertvollste Vergleich',
                 'Ein <b>Vor-EKG</b>. Eine seit Jahren bestehende Negativierung ist '
                 'meist harmlos — dieselbe Kurve <b>neu aufgetreten</b> kann eine akute '
                 'Ischämie bedeuten.'))

    o.append(sec('1.10 Die QT-Zeit'))
    o.append(p('Die QT-Zeit umfasst die gesamte Kammeraktion — vom Beginn des '
               'QRS-Komplexes bis zum Ende der T-Welle. Sie ist stark '
               '<b>frequenzabhängig</b>: Je schneller das Herz schlägt, desto kürzer '
               'wird sie.'))
    o.append(box('bad', 'Deshalb sagt eine absolute QT-Zeit allein nichts aus',
                 'Ein Wert von 500 ms ist bei einer Frequenz von 45/min unauffällig und '
                 'bei 100/min hochpathologisch. Vergleichbar wird die Messung erst durch '
                 'die <b>frequenzkorrigierte QTc</b> (nach Bazett). Normal: <b>unter '
                 '440 ms bei Männern, unter 460 ms bei Frauen.</b> Die klassische '
                 'Alternative ist die relative QT-Zeit in Prozent des '
                 'frequenzbezogenen Sollwerts.'))
    o.append(Spacer(1, 10))
    o.append(bullets([
        ('Faustregel am Streifen —', 'Reicht die QT-Zeit über die Hälfte des RR-Abstands '
                                     'hinaus, ist sie bei normaler Frequenz verdächtig lang.'),
        ('Gefahr —', 'Eine verlängerte QT-Zeit ist der Nährboden für <b>Torsade de '
                     'pointes</b> und kann Synkopen auslösen.'),
    ], colour=VIOLET_DK))

    o.append(sec('1.11 Der Lagetyp'))
    o.append(p('Der Lagetyp beschreibt die Lage des <b>Hauptvektors der '
               'Kammererregung</b> in der Frontalebene. Bestimmt wird er aus den '
               'sechs Extremitätenableitungen I, II, III, aVR, aVL und aVF.'))
    o.append(box('key', 'Der schnellste Weg',
                 'Die Herzachse zeigt ungefähr in Richtung der Ableitung mit dem '
                 '<b>größten überwiegend positiven QRS-Komplex</b>. Sind I und II '
                 'beide positiv, liegt der Lagetyp im Normbereich. LIFEPAK und corpuls³ '
                 'berechnen die Achse zusätzlich automatisch.'))
    o.append(Spacer(1, 12))
    o.append(Cabrera(CW, 210))
    o.append(caption('10 — Cabrera-Kreis: Blickrichtung der sechs Extremitätenableitungen. '
                     'Positive Winkel zeigen nach unten.'))
    o.append(table(
        ['Lagetyp', 'Bereich', 'Bewertung'],
        [['Überdrehter Linkstyp', '−30° bis −90°', 'Immer pathologisch'],
         ['Linkstyp', '−30° bis +30°', 'Beim Erwachsenen meist physiologisch'],
         ['Indifferenztyp', '+30° bis +60°', 'Der Normalfall'],
         ['Steiltyp', '+60° bis +90°', 'Bei jungen, schlanken Erwachsenen physiologisch'],
         ['Rechtstyp', '+90° bis +120°', 'Beim Erwachsenen pathologisch — bei Kindern normal'],
         ['Überdrehter Rechtstyp', '+120° bis +180°', 'Immer pathologisch']],
        widths=[132, 96, CW - 228]))
    o.append(Spacer(1, 14))
    o.append(h3('Den Lagetyp aus I, II und III ablesen'))
    o.append(p('Dafür brauchst du keinen Winkelmesser. Es genügt zu schauen, ob der '
               'QRS-Komplex in den drei Einthoven-Ableitungen überwiegend nach '
               '<b>oben</b> oder nach <b>unten</b> zeigt — und in welcher er am '
               'größten ist.'))
    o.append(LeadGrid(CW, axis_leads(48), cell_h=86, mv_top=1.95, mv_bot=-1.95))
    o.append(caption('11 — Beispiel: II am größten, I und III positiv. Das ist der '
                     'Indifferenztyp.'))
    o.append(KeepTogether(table(
        ['Lagetyp', 'I', 'II', 'III'],
        [['Überdrehter Linkstyp', 'positiv', 'negativ', 'negativ'],
         ['Linkstyp', 'positiv (groß)', 'positiv', 'negativ'],
         ['Indifferenztyp', 'positiv', 'positiv (am größten)', 'positiv (klein)'],
         ['Steiltyp', 'positiv (klein)', 'positiv', 'positiv (groß)'],
         ['Rechtstyp', 'negativ', 'positiv', 'positiv (am größten)'],
         ['Überdrehter Rechtstyp', 'negativ (groß)', 'negativ', 'positiv']],
        widths=[136, 108, 128, CW - 372])))
    o.append(Spacer(1, 10))
    o.append(box('key', 'Drei Kurzregeln',
                 '<b>I und II beide positiv:</b> Lagetyp im Normbereich.<br/>'
                 '<b>I negativ:</b> Rechtstyp oder überdrehter Rechtstyp.<br/>'
                 '<b>II und III beide negativ:</b> überdrehter Linkstyp.'))
    o.append(Spacer(1, 10))
    o.append(box('warn', 'Alter mitdenken',
                 'Bei Kindern und Jugendlichen ist ein Rechtstyp <b>physiologisch</b>, '
                 'weil die rechte Kammer relativ kräftiger ist. Erst mit dem Wachstum '
                 'wandert der Lagetyp nach links. Auch gilt: Die elektrische Herzachse '
                 'ist nicht dasselbe wie die anatomische Lage des Herzens.'))
    return o


# =====================================================================
#  KAPITEL 2 — RHYTHMEN UND BLOCKBILDER
# =====================================================================

def kapitel2():
    o = [PageBreak()]
    o += chapter(2, 'Rhythmen und Blockbilder', 'Wer gibt den Takt vor — und kommt er an?',
                 HEART)

    o.append(sec('2.1 Sinusrhythmus'))
    o.append(p('Ob ein Sinusrhythmus vorliegt, klärst du mit fünf Fragen. Werden alle '
               'mit Ja beantwortet, ist es einer.'))
    o.append(bullets([
        ('1 —', 'Sind P-Wellen abgrenzbar? (Eine geeignete Ableitung genügt, meist II.)'),
        ('2 —', 'Sind die P-Wellen unauffällig geformt?'),
        ('3 —', 'Sind die PP-Intervalle konstant?'),
        ('4 —', 'Ist die PQ-Zeit normal (120–200 ms)?'),
        ('5 —', 'Folgt auf jede P-Welle ein QRS-Komplex?'),
    ]))
    o.append(Spacer(1, 8))
    o.append(Strip(CW, 104, tpl({}), seconds=3.4, rate=70))
    o.append(caption('12 — Normaler Sinusrhythmus: vor jedem QRS-Komplex eine P-Welle, '
                     'konstante Abstände.'))
    o.append(table(
        ['Variante', 'Kennzeichen'],
        [['Regulärer Sinusrhythmus', 'Frequenz 60–100/min, regelmäßig'],
         ['Sinusbradykardie', 'Frequenz unter 60/min'],
         ['Sinustachykardie', 'Frequenz über 100/min'],
         ['Sinusarrhythmie', 'Unregelmäßiger Sinusrhythmus'],
         ['Sinusbradyarrhythmie', 'Unregelmäßig und unter 60/min'],
         ['Sinustachyarrhythmie', 'Unregelmäßig und über 100/min']],
        widths=[168, CW - 168]))
    o.append(Spacer(1, 10))
    o.append(box('warn', 'Zur Zahlengrenze',
                 'Dieses Skript verwendet die verbreitete Konvention <b>60–100/min</b>. '
                 'Einzelne Lehrbücher — darunter das Kursbuch — setzen die untere Grenze '
                 'bei 50/min an. Beides ist gebräuchlich; entscheidend ist, dass du im '
                 'Befund dazuschreibst, welche Grenze du meinst. Klinisch zählt ohnehin '
                 'nicht die Zahl allein, sondern ob der Patient Beschwerden hat.'))

    o.append(sec('2.2 Sinuatriale Blockierungen (SA-Block)'))
    o.append(p('Beim SA-Block stockt die Überleitung schon zwischen Sinusknoten und '
               'Vorhofmuskulatur. Der Sinusknoten selbst ist im EKG <b>nicht sichtbar</b> — '
               'du erkennst den Block nur indirekt an den P-Wellen. Und weil das Problem '
               'vor der Vorhoferregung liegt, fällt hier eine <b>komplette Aktion</b> aus: '
               'P-Welle und QRS-Komplex zusammen.'))
    o.append(h3('Grad I'))
    o.append(p('Die Überleitung ist nur verzögert, nichts fällt aus. Im Oberflächen-EKG '
               '<b>nicht erkennbar</b>.'))
    o.append(h3('Grad II Typ 1 — Wenckebach-Periodik'))
    o.append(p('Der Sinusknoten bildet den Impuls weiterhin, die Überleitung ins '
               'Vorhofgewebe wird jedoch von Schlag zu Schlag träger, bis ein Impuls '
               'ganz ausfällt.'))
    o.append(bullets([
        ('Typisch —', 'Die PP-Intervalle werden vor der Pause zunehmend <b>kürzer</b>.'),
        ('Dann —', 'Eine P-Welle fällt aus, meist mit dem zugehörigen QRS-Komplex.'),
        ('Danach —', 'Die Periodik beginnt von vorn.'),
    ]))
    o.append(Spacer(1, 6))
    o.append(box('key', 'Warum kürzer und nicht länger?',
                 'Die Verzögerung nimmt zwar zu — aber ihr <i>Zuwachs</i> wird von Schlag '
                 'zu Schlag kleiner. Unterm Strich rücken die sichtbaren P-Wellen deshalb '
                 'enger zusammen. Dieses zunächst widersinnige Verhalten ist das '
                 'Erkennungszeichen der Wenckebach-Periodik.'))
    o.append(Spacer(1, 10))
    o.append(h3('Grad II Typ 2 — Mobitz-Typ'))
    o.append(p('Die PP-Intervalle bleiben völlig regelmäßig, dann fällt plötzlich eine '
               'ganze Aktion aus. Die Pause misst <b>genau zwei PP-Abstände</b>, weil der '
               'Sinusknoten unbeirrt weitertaktet.'))
    o.append(Spacer(1, 4))
    o.append(Strip(CW, 104, tpl({}), seconds=3.8, rate=70))
    o.append(caption('13 — Zum Vergleich der Normalbefund: gleichmäßige Abstände ohne Ausfall.'))
    o.append(h3('Grad III'))
    o.append(p('Kompletter Sinusarrest — es kommt kein Impuls mehr an. Ein Ersatzzentrum '
               'muss übernehmen, sonst droht die Asystolie.'))
    o.append(Spacer(1, 8))
    o.append(box('ok', 'Klinische Einordnung',
                 'Der SA-Block II° Typ 1 ist meist gutartig und oft vagal bedingt. '
                 'Typ 2 und der Sinusarrest können symptomatisch werden — bis hin '
                 'zur Synkope.'))
    return o


def kapitel2b():
    o = []
    o.append(sec('2.3 Atrioventrikuläre Blockierungen (AV-Block)'))
    o.append(p('Beim AV-Block liegt das Problem in der Überleitung zwischen Vorhof und '
               'Kammer — meist auf Höhe des AV-Knotens oder des His-Bündels. Die P-Welle '
               'ist also vorhanden; was fehlt, ist der QRS-Komplex dahinter.'))
    o.append(table(
        ['Grad', 'Kennzeichen im EKG'],
        [['I°', 'PQ-Zeit über 200 ms. Auf jede P-Welle folgt ein QRS-Komplex — nur später. '
                'Kein Ausfall.'],
         ['II° Typ 1 (Wenckebach)', 'Die AV-Überleitungszeit nimmt von Aktion zu Aktion zu, '
                                    'bis nach einer P-Welle ein QRS-Komplex ausfällt. '
                                    'Danach beginnt die Periodik von vorn.'],
         ['II° Typ 2 (Mobitz)', 'Plötzlicher Ausfall eines QRS-Komplexes ohne '
                                'vorherige PQ-Verlängerung. Die PQ-Zeit bleibt konstant.'],
         ['III°', 'AV-Dissoziation: Vorhöfe und Kammern schlagen völlig unabhängig '
                  'voneinander. Keine Überleitung.']],
        widths=[136, CW - 136]))
    o.append(Spacer(1, 12))
    o.append(box('bad', 'Beim AV-Block III° entscheidet der Ersatzrhythmus',
                 'Wie schnell die Kammern schlagen, hängt davon ab, <b>wo</b> das '
                 'Ersatzzentrum sitzt. Aus AV-Knoten oder His-Bündel: <b>40–60/min mit '
                 'schmalem QRS-Komplex</b>. Aus einem Zentrum weiter unten in der Kammer: '
                 'nur <b>20–40/min mit breitem QRS-Komplex</b> — deutlich langsamer und '
                 'unzuverlässiger. Der zweite Fall ist der gefährliche.'))
    o.append(Spacer(1, 10))
    o.append(bullets([
        ('Merkhilfe —', '<b>Wenckebach</b> wird „länger und länger, bis er weg ist". '
                        '<b>Mobitz II</b> kommt „aus heiterem Himmel".'),
        ('Therapierelevanz —', 'Mobitz II und der AV-Block III° gelten als '
                               'Schrittmacherindikation, weil sie in eine Asystolie '
                               'übergehen können (Adams-Stokes-Anfall).'),
    ], colour=GOLD_DK))

    o.append(sec('2.4 SA-Block oder AV-Block?'))
    o.append(box('key', 'Die eine Frage, die beides trennt',
                 '<b>SA-Block = Problem vor der P-Welle.</b> Es fehlt die komplette '
                 'Aktion — P-Welle und QRS-Komplex.<br/><br/>'
                 '<b>AV-Block = Problem nach der P-Welle.</b> Die P-Welle ist sichtbar, '
                 'nur der QRS-Komplex fehlt.'))
    o.append(Spacer(1, 10))
    o.append(p('Praktisch heißt das: Suche in der Pause nach einer P-Welle. Findest du '
               'eine, war es ein AV-Block. Ist die Pause vollständig leer, war es ein '
               'SA-Block.'))

    o.append(sec('2.5 Rechtsschenkelblock'))
    o.append(p('Der rechte Tawara-Schenkel fällt aus. Die rechte Kammer wird deshalb '
               'verspätet und auf Umwegen erregt — langsam von Muskelzelle zu Muskelzelle. '
               'Der QRS-Komplex wird dadurch breit und verformt.'))
    o.append(bullets([
        ('QRS-Breite —', 'über 120 ms (kompletter Block).'),
        ('V1 und V2 —', 'typische M-Form: <b>rSR’</b>.'),
        ('I, V5 und V6 —', 'breite, plumpe <b>S-Zacke</b>.'),
    ]))
    o.append(Spacer(1, 8))
    o.append(LeadGrid(CW, [
        ('V1', {'q': {'a': 0}, 'r': {'c': 0.026, 'w': 0.013, 'a': 0.50}, 's': {'c': 0.056, 'w': 0.013, 'a': -0.40},
                'r2': {'c': 0.096, 'w': 0.021, 'a': 1.00}, 't': {'c': 0.285, 'a': -0.30}, 'stEnd': 0.225}),
        ('V2', {'q': {'a': 0}, 'r': {'c': 0.026, 'w': 0.013, 'a': 0.42}, 's': {'c': 0.056, 'w': 0.013, 'a': -0.55},
                'r2': {'c': 0.096, 'w': 0.021, 'a': 0.80}, 't': {'c': 0.285, 'a': -0.20}, 'stEnd': 0.225}),
        ('V3', {'q': {'a': 0}, 'r': {'a': 0.80}, 's': {'c': 0.078, 'w': 0.026, 'a': -0.75}, 't': {'c': 0.275, 'a': 0.30}, 'stEnd': 0.225}),
        ('V4', {'q': {'a': -0.05}, 'r': {'a': 1.20}, 's': {'c': 0.082, 'w': 0.028, 'a': -0.60}, 't': {'c': 0.275, 'a': 0.30}, 'stEnd': 0.225}),
        ('V5', {'q': {'a': -0.07}, 'r': {'a': 1.35}, 's': {'c': 0.086, 'w': 0.030, 'a': -0.52}, 't': {'c': 0.275, 'a': 0.26}, 'stEnd': 0.225}),
        ('V6', {'q': {'a': -0.08}, 'r': {'a': 1.15}, 's': {'c': 0.090, 'w': 0.032, 'a': -0.48}, 't': {'c': 0.275, 'a': 0.24}, 'stEnd': 0.225}),
    ]))
    o.append(caption('14 — Rechtsschenkelblock: M-Form in V1/V2, breite S-Zacke in V5/V6.'))
    o.append(box('ok', 'Klinische Einordnung',
                 'Ein Rechtsschenkelblock kann auch bei Herzgesunden als Zufallsbefund '
                 'vorkommen — der inkomplette RSB ist bei jungen Menschen sogar häufig.'))

    o.append(sec('2.6 Linksschenkelblock'))
    o.append(p('Beim Linksschenkelblock läuft alles spiegelbildlich: In V1 fehlt jede '
               'nennenswerte positive Zacke, dafür steht in V5 und V6 ein breites, '
               'plumpes R.'))
    o.append(bullets([
        ('QRS-Breite —', 'über 120 ms (kompletter Block).'),
        ('V1 bis V3 —', 'tiefes S oder <b>QS-Komplex</b>.'),
        ('I, aVL, V5 und V6 —', 'breites, plumpes, oft geknotetes <b>R</b> — '
                                'ohne S-Zacke.'),
        ('T-Welle —', 'zeigt der Hauptrichtung des QRS-Komplexes entgegen '
                      '(diskordant). Das ist hier <b>normal</b>.'),
    ]))
    o.append(Spacer(1, 8))
    o.append(LeadGrid(CW, [
        ('V1', {'q': {'c': 0.050, 'w': 0.036, 'a': -1.40}, 'r': {'a': 0}, 's': {'a': 0},
                't': {'c': 0.310, 'w': 0.075, 'a': 0.40}, 'st': 0.10, 'stEnd': 0.235}),
        ('V2', {'q': {'c': 0.050, 'w': 0.038, 'a': -1.55}, 'r': {'a': 0}, 's': {'a': 0},
                't': {'c': 0.310, 'w': 0.075, 'a': 0.44}, 'st': 0.12, 'stEnd': 0.235}),
        ('V3', {'q': {'c': 0.052, 'w': 0.038, 'a': -1.30}, 'r': {'a': 0.10}, 's': {'a': 0},
                't': {'c': 0.310, 'w': 0.075, 'a': 0.38}, 'st': 0.10, 'stEnd': 0.235}),
        ('V4', {'q': {'a': 0}, 'r': {'c': 0.056, 'w': 0.038, 'a': 0.75}, 's': {'c': 0.118, 'w': 0.020, 'a': -0.30},
                't': {'c': 0.310, 'w': 0.075, 'a': -0.30}, 'stEnd': 0.235}),
        ('V5', {'q': {'a': 0}, 'r': {'c': 0.058, 'w': 0.040, 'a': 1.30}, 'r2': {'c': 0.098, 'w': 0.026, 'a': 0.35},
                's': {'a': 0}, 't': {'c': 0.315, 'w': 0.078, 'a': -0.42}, 'st': -0.07, 'stEnd': 0.240}),
        ('V6', {'q': {'a': 0}, 'r': {'c': 0.058, 'w': 0.042, 'a': 1.20}, 'r2': {'c': 0.100, 'w': 0.028, 'a': 0.30},
                's': {'a': 0}, 't': {'c': 0.315, 'w': 0.078, 'a': -0.40}, 'st': -0.07, 'stEnd': 0.240}),
    ]))
    o.append(caption('15 — Linksschenkelblock: QS in V1–V3, breites plumpes R in V5/V6.'))
    o.append(box('bad', 'Häufige Verwechslung',
                 'Die breite, plumpe <b>S-Zacke in Ableitung I und V6</b> gehört zum '
                 '<b>Rechts</b>schenkelblock. Beim <b>Links</b>schenkelblock steht dort '
                 'umgekehrt ein breites <b>R</b>, und der QS-Komplex liegt in V1 bis V3. '
                 'Wer das vertauscht, benennt jeden Block spiegelverkehrt.'))
    o.append(Spacer(1, 10))
    o.append(box('warn', 'Neu aufgetreten ist ein Alarmzeichen',
                 'Ein Rechtsschenkelblock kann harmlos sein. Ein Linksschenkelblock weist '
                 'dagegen fast immer auf eine strukturelle Herzerkrankung hin — und ein '
                 '<b>neu aufgetretener</b> Linksschenkelblock gilt bei passender Klinik '
                 'als Infarktäquivalent.'))

    o.append(sec('2.7 Präexzitation: WPW und LGL'))
    o.append(p('Normalerweise ist der AV-Knoten der einzige Weg vom Vorhof zur Kammer — '
               'und er bremst absichtlich. Manche Menschen haben eine zusätzliche '
               'Leitungsbahn, die diese Bremse umgeht. Die Kammer wird dadurch '
               '<b>vorzeitig</b> erregt.'))
    o.append(table(
        ['', 'WPW-Syndrom', 'LGL-Syndrom'],
        [['Bahn', 'Kent-Bündel — direkt zur Kammermuskulatur',
          'James-Bündel — mündet hinter dem AV-Knoten'],
         ['PQ-Zeit', 'unter 120 ms', 'unter 120 ms'],
         ['Delta-Welle', 'ja', 'nein'],
         ['QRS-Komplex', 'verbreitert', 'schmal']],
        widths=[92, (CW - 92) / 2, (CW - 92) / 2]))
    o.append(Spacer(1, 12))
    o.append(box('key', 'Was die Delta-Welle eigentlich ist',
                 'Die zusätzliche Bahn erregt die Kammermuskulatur direkt — also langsam, '
                 'von Zelle zu Zelle. Das ergibt den trägen, schrägen Anstieg am Beginn '
                 'des QRS-Komplexes. Kurz darauf trifft die reguläre Erregung über das '
                 'schnelle Leitungssystem ein und vollendet den Komplex. Der QRS-Komplex '
                 'ist deshalb eine <b>Mischung aus beiden Wegen</b>.'))
    o.append(Spacer(1, 10))
    o.append(h3('Warum das gefährlich werden kann'))
    o.append(bullets([
        ('Kreisende Erregung —', 'Die Erregung kann über den AV-Knoten hinunter- und über '
                                 'die Bahn wieder hinauflaufen. Das löst anfallsartige '
                                 'Schmalkomplextachykardien aus (AVRT).'),
        ('Vorhofflimmern bei WPW —', 'Hier fehlt die bremsende Wirkung des AV-Knotens. '
                                     'Die schnelle Bahn kann sehr viele Impulse '
                                     'durchlassen — bis hin zum Kammerflimmern.'),
        ('Syndrom oder nur Bild? —', 'Viele Menschen mit Präexzitation im EKG bekommen '
                                     'nie Beschwerden. Von einem <b>Syndrom</b> spricht '
                                     'man erst, wenn Rhythmusstörungen dazukommen.'),
    ], colour=HEART_DK))
    return o


# =====================================================================
#  KAPITEL 3 — ISCHÄMIE UND SONDERFÄLLE
# =====================================================================

def kapitel3():
    o = [PageBreak()]
    o += chapter(3, 'Ischämie und Sonderfälle', 'Wenn die Durchblutung nicht reicht',
                 HexColor('#ff6b35'))

    o.append(sec('3.1 ST-Streckenveränderungen im Überblick'))
    o.append(bullets([
        ('ST-Hebung aus dem absteigenden R-Schenkel —', 'ST-Hebungsinfarkt (STEMI).'),
        ('ST-Hebung aus dem aufsteigenden S-Schenkel —', 'Perikarditis.'),
        ('ST-Senkung —', 'aszendierend, deszendierend oder horizontal. Horizontal und '
                         'deszendierend sprechen am ehesten für eine Ischämie.'),
    ], colour=HexColor('#c2410c')))
    o.append(Spacer(1, 10))
    o.append(box('bad', 'Signifikanzgrenzen beim STEMI',
                 'ST-Hebung ab <b>0,1 mV</b> in den Extremitätenableitungen, ab '
                 '<b>0,2 mV</b> in V2/V3 — und immer in <b>mindestens zwei benachbarten '
                 'Ableitungen</b>. Eine isolierte Hebung in nur einer Ableitung spricht '
                 'eher für ein Artefakt oder eine Normvariante.'))
    o.append(Spacer(1, 10))
    o.append(table(
        ['Lokalisation', 'Ableitungen', 'Gefäß'],
        [['Inferior (Hinterwand)', 'II, III, aVF', 'RCA'],
         ['Anteroseptal (Vorderwand)', 'V1–V4', 'RIVA / LAD'],
         ['Lateral (Seitenwand)', 'I, aVL, V5, V6', 'RCX'],
         ['Streng posterior', 'Spiegelbild in V1–V3, direkt V7–V9', 'RCX oder RCA']],
        widths=[152, 168, CW - 320]))
    o.append(Spacer(1, 10))
    o.append(box('warn', 'Bei inferiorem Infarkt immer mitdenken',
                 'Schreibe zusätzlich die rechtspräkordialen Ableitungen <b>V3r/V4r</b>. '
                 'Ein begleitender Rechtsherzinfarkt ändert die Therapie erheblich — '
                 'Nitrate sind dann gefährlich, weil der rechte Ventrikel auf '
                 'ausreichende Vorlast angewiesen ist.'))

    o.append(sec('3.2 Gestörte R-Progression'))
    o.append(p('Bleibt die R-Zacke über V1 bis V4 winzig oder fehlt ganz, spricht man von '
               'gestörter R-Progression oder R-Verlust. Kommen breite Q-Zacken dazu, wird '
               'ein <b>abgelaufener Vorderwandinfarkt</b> wahrscheinlich — der '
               'abgestorbene Muskel ist elektrisch stumm.'))
    o.append(Spacer(1, 6))
    o.append(LeadGrid(CW, [
        ('V1', {'q': {'c': 0.014, 'w': 0.014, 'a': -0.55}, 'r': {'a': 0.04}, 's': {'a': -0.55}, 't': {'a': -0.16}}),
        ('V2', {'q': {'c': 0.014, 'w': 0.015, 'a': -0.70}, 'r': {'a': 0.08}, 's': {'a': -0.60}, 't': {'a': -0.22}}),
        ('V3', {'q': {'c': 0.014, 'w': 0.015, 'a': -0.65}, 'r': {'a': 0.12}, 's': {'a': -0.50}, 't': {'a': -0.26}}),
        ('V4', {'q': {'c': 0.014, 'w': 0.014, 'a': -0.50}, 'r': {'a': 0.22}, 's': {'a': -0.35}, 't': {'a': -0.20}}),
        ('V5', {'q': {'a': -0.12}, 'r': {'a': 0.95}, 's': {'a': -0.20}, 't': {'a': 0.18}}),
        ('V6', {'q': {'a': -0.10}, 'r': {'a': 1.10}, 's': {'a': -0.10}, 't': {'a': 0.22}}),
    ]))
    o.append(caption('16 — Fehlender R-Aufbau mit Q-Zacken über der Vorderwand. '
                     'Vergleiche mit Abbildung 5.'))
    o.append(box('bad', 'Verdacht — kein Beweis',
                 'Gestörte R-Progression plus pathologische Q-Zacken machen einen '
                 'abgelaufenen Vorderwandinfarkt <b>wahrscheinlich</b>, beweisen ihn aber '
                 'nicht. Andere Ursachen: Linksherzhypertrophie, Lungenüberblähung bei '
                 'COPD, Kardiomyopathie — und, sehr häufig, schlicht falsch geklebte '
                 'Brustwandelektroden. Erst die Zusammenschau mit Vorgeschichte, Klinik '
                 'und Bildgebung sichert die Diagnose.'))

    o.append(sec('3.3 Long-QT-Syndrom'))
    o.append(p('Die QT-Zeit reicht vom Beginn des QRS-Komplexes bis zum Ende der '
               'T-Welle. Ist sie — frequenzkorrigiert — verlängert, spricht man vom '
               'Long-QT-Syndrom (LQTS).'))
    o.append(Spacer(1, 4))
    o.append(Strip(CW, 104, tpl({'t': {'c': 0.420, 'w': 0.085, 'a': 0.26}}),
                   seconds=3.4, rate=62))
    o.append(caption('17 — Verlängerte QT-Zeit: Die T-Welle liegt weit vom QRS-Komplex '
                     'entfernt.'))
    o.append(bullets([
        ('Folgen —', 'Das LQTS kann Synkopen auslösen und in eine <b>Torsade de '
                     'pointes</b> übergehen — eine lebensbedrohliche Kammertachykardie.'),
        ('Ursachen —', 'Medikamente (bestimmte Antiarrhythmika, Antibiotika, '
                       'Antipsychotika), Hypokaliämie, Hypomagnesiämie sowie angeborene '
                       'Long-QT-Syndrome.'),
        ('Therapie der Torsade —', 'unter anderem Magnesium; auslösende Medikamente '
                                   'absetzen, Elektrolyte ausgleichen.'),
    ], colour=VIOLET_DK))

    # ------------------------------------------------------------- Synkopen
    o.append(sec('3.4 EKG bei Synkopen'))
    o.append(p('Eine Synkope ist eine kurze Bewusstlosigkeit durch vorübergehende '
               'Minderdurchblutung des Gehirns: plötzlicher Beginn, kurze Dauer, '
               'vollständige Erholung von allein. Die allermeisten sind harmlos — '
               'genau darin liegt die Schwierigkeit. Die wenigen kardialen Synkopen '
               'musst du aus der großen Masse herausfischen, und oft ist das EKG der '
               'einzige Hinweis, den du in der Akutsituation bekommst.'))
    o.append(bullets([
        ('Reflexsynkope (vasovagal) —', 'die häufigste Form. Auslöser wie Schmerz, '
         'langes Stehen, Hitze oder Blutsehen; typische Vorboten wie Übelkeit, '
         'Schwitzen und Schwarzwerden vor den Augen.'),
        ('Orthostatische Synkope —', 'beim Aufstehen, oft bei Volumenmangel oder unter '
         'blutdrucksenkenden Medikamenten.'),
        ('Kardiale Synkope —', 'Rhythmusstörung oder strukturelle Herzerkrankung. Die '
         'seltenste Gruppe — aber die einzige, die tödlich enden kann.'),
    ]))
    o.append(Spacer(1, 10))
    o.append(box('bad', 'Die drei wichtigsten roten Flaggen',
                 '<b>QTc über 500 ms</b> ist kardial auffällig.<br/>'
                 '<b>Eine vasovagale Synkope dauert meist höchstens eine Minute</b> — '
                 'wer länger weg war, gehört genauer angesehen.<br/>'
                 '<b>Palpitationen unmittelbar vor der Synkope</b> bedeuten: kardial, '
                 'bis das Gegenteil bewiesen ist.'))
    o.append(Spacer(1, 12))
    o.append(table(
        ['', 'Spricht für Reflexsynkope', 'Spricht für kardiale Synkope'],
        [['Vorboten', 'Übelkeit, Schwitzen, Augenflimmern', 'keine — Sturz ohne Vorwarnung'],
         ['Davor', 'Schmerz, Hitze, langes Stehen', 'Palpitationen, Herzrasen'],
         ['Situation', 'im Stehen, nach Belastung', 'im Liegen/Sitzen, während Belastung'],
         ['Dauer', 'meist unter 1 Minute', 'oft länger'],
         ['Umfeld', 'unauffällige Vorgeschichte', 'Herzerkrankung, plötzlicher Herztod in der Familie unter 40']],
        widths=[74, 176, CW - 250]))

    o.append(h3('Die Fahndungsliste im EKG'))
    o.append(p('Nach diesen Befunden suchst du gezielt, wenn ein Patient wegen einer '
               'Synkope vor dir liegt. Fast alle kennst du aus den vorherigen '
               'Kapiteln — hier stehen sie unter einer gemeinsamen Fragestellung.'))
    o.append(bullets([
        ('QT-Zeit —', 'QTc über <b>500 ms</b>: deutliches Risiko für Torsade de pointes. '
                      'Auch eine auffällig <i>kurze</i> QT-Zeit ist verdächtig.'),
        ('Delta-Welle mit kurzer PQ-Zeit —', 'Präexzitation (WPW).'),
        ('Brugada-Muster —', 'gewölbte ST-Hebung mit negativem T in V1/V2.'),
        ('Leitungsstörungen —', 'AV-Block II° oder III°, bifaszikulärer Block, '
                                'ausgeprägte Bradykardie, lange Pausen.'),
        ('Strukturelle Hinweise —', 'pathologische Q-Zacken nach altem Infarkt, Zeichen '
                                    'einer Linksherzhypertrophie.'),
        ('Ventrikuläre Salven —', 'gehäufte VES oder eine dokumentierte '
                                  'Kammertachykardie.'),
    ], colour=HexColor('#c2410c')))
    o.append(Spacer(1, 8))
    o.append(box('key', 'Kein Widerspruch zu Kapitel 1',
                 'Verlängert ist die QTc bereits <b>über 440 ms bei Männern bzw. '
                 '460 ms bei Frauen</b>. Die <b>500 ms</b> sind die Schwelle, ab der es '
                 'bei einer Synkope klar alarmierend wird.'))
    o.append(Spacer(1, 12))
    o.append(LeadGrid(CW, [
        ('V1', {'q': {'a': 0}, 'r': {'c': 0.026, 'w': 0.012, 'a': 0.60},
                's': {'c': 0.052, 'w': 0.011, 'a': -0.15},
                'r2': {'c': 0.095, 'w': 0.055, 'a': 0.95},
                't': {'c': 0.235, 'w': 0.062, 'a': -0.45}, 'stEnd': 0.200}),
        ('V2', {'q': {'a': 0}, 'r': {'c': 0.026, 'w': 0.012, 'a': 0.55},
                's': {'c': 0.052, 'w': 0.011, 'a': -0.20},
                'r2': {'c': 0.098, 'w': 0.058, 'a': 1.05},
                't': {'c': 0.240, 'w': 0.064, 'a': -0.50}, 'stEnd': 0.200}),
        ('V3', {'q': {'a': 0}, 'r': {'a': 0.80}, 's': {'c': 0.062, 'w': 0.014, 'a': -0.70},
                't': {'c': 0.250, 'w': 0.060, 'a': 0.30}}),
    ], cell_h=86))
    o.append(caption('18 — Brugada-Muster Typ 1: gewölbte ST-Hebung mit negativem T in '
                     'V1 und V2, in V3 nicht mehr nachweisbar.'))
    o.append(box('warn', 'Ein normales EKG beweist nichts',
                 'Rhythmusstörungen treten anfallsweise auf — zwischen den Episoden kann '
                 'das EKG völlig unauffällig sein. Ein normales EKG senkt das Risiko, '
                 'schließt eine kardiale Ursache aber nicht aus. Entscheidend bleibt die '
                 'Zusammenschau mit der Vorgeschichte. Was daraus folgt, regeln die '
                 'Vorgaben deines Dienstes.'))
    return o


# =====================================================================
#  KAPITEL 4 - MEDIKAMENTE
# =====================================================================

def kapitel4():
    o = [PageBreak()]
    o += chapter(4, 'Medikamente', 'Wirkstoff, Dosis, Gabe und EKG-Wirkung',
                 HEART)

    o.append(lead(
        'Im EKG-Notfall reicht der Name eines Wirkstoffs nicht. Eine sichere '
        'Anordnung nennt den <b>aktiven Wirkstoff</b>, die Dosis mit Einheit, '
        'den Applikationsweg, die Geschwindigkeit und den Zeitpunkt der '
        'erneuten Beurteilung. Dieses Kapitel verwendet ausschließlich '
        'Wirkstoffnamen, keine Handelsnamen.'))

    o.append(sec('4.1 Medikamente sicher geben'))
    o.append(bullets([
        ('Wirkstoff -', 'zum Beispiel <b>Adenosin</b>; keine mehrdeutigen '
                        'Handelsnamen oder Umschreibungen.'),
        ('Dosis und Einheit -', '„6" allein ist unvollständig. Erst <b>6 mg</b> '
                                'ist eindeutig.'),
        ('Applikationsweg und Tempo -', 'bei Adenosin gehören der sehr schnelle '
                                        'intravenöse Bolus und die unmittelbar '
                                        'folgende Spülung zur wirksamen Gabe.'),
        ('Aufzeichnung -', 'Rhythmusstreifen beziehungsweise 12-Kanal-EKG '
                           'während der Gabe mitschreiben.'),
        ('Neubeurteilung -', 'nach jeder Gabe zuerst Rhythmus, Puls, Symptome '
                             'und Kreislauf kontrollieren; nicht automatisch '
                             'die nächste Dosis geben.'),
    ], colour=HEART_DK))
    o.append(Spacer(1, 8))
    o.append(box('key', 'Die vollständige Anordnung',
                 '<b>Wirkstoff + Dosis + Einheit + Weg + Geschwindigkeit + '
                 'Kontrolle.</b> Diese sechs Angaben machen eine Medikamentengabe '
                 'eindeutig und ihre Wirkung am Monitor nachvollziehbar.'))

    o.append(sec('4.2 Adenosin bei regelmäßiger Reentry-SVT'))
    o.append(p(
        'Eine regelmäßige Schmalkomplextachykardie kann durch eine kreisende '
        'Erregung über oder nahe dem AV-Knoten entstehen. Bei einer '
        'kreislaufstabilen erwachsenen Person kann <b>Adenosin</b> nach '
        'erfolglosen Vagusmanövern die AV-Überleitung extrem kurz blockieren '
        'und eine AV-knotenabhängige Reentrytachykardie beenden.'))
    o.append(table(
        ['Situation', 'Dosis', 'Gabe'],
        [['Erste Gabe', '6 mg', 'sehr schneller intravenöser Bolus, sofort spülen'],
         ['SVT besteht weiter', '12 mg', 'nach Neubeurteilung erneut sehr schnell'],
         ['Weiterhin erfolglos', '18 mg erwägen', 'Verträglichkeit und Nebenwirkungen beachten']],
        widths=[132, 92, CW - 224]))
    o.append(Spacer(1, 10))
    o.append(box('warn', 'Vor der Gabe prüfen',
                 'Diese Dosierung gilt für kreislaufstabile Erwachsene mit '
                 'regelmäßiger Tachykardie. Bei hämodynamischer Instabilität '
                 'hat die synchronisierte Kardioversion Vorrang. Adenosin ist '
                 'keine Behandlung einer Sinustachykardie und nicht für eine '
                 'unregelmäßige breitkomplexige Tachykardie gedacht. Lokale '
                 'SOPs und Kontraindikationen bleiben verbindlich.'))
    o.append(Spacer(1, 12))
    o.append(box('key', 'Warum die Gabe sehr schnell sein muss',
                 'Adenosin wirkt nur wenige Sekunden. Bei einer langsamen Gabe '
                 'kann ein großer Teil bereits abgebaut sein, bevor genügend '
                 'Wirkstoff am Herzen ankommt. Deshalb: schneller Bolus, sofort '
                 'spülen und das EKG währenddessen aufzeichnen.'))

    o.append(sec('4.3 Was nach Adenosin im EKG sichtbar wird'))
    o.append(p(
        'Adenosin erzeugt nicht einfach eine elektrische Nulllinie. Während '
        'der sehr kurzen AV-Blockierung kann der Sinusknoten weiter feuern. '
        'Dann erscheinen <b>P-Wellen ohne nachfolgenden QRS-Komplex</b>. Nach '
        'Beendigung der Reentry-SVT kann eine zuvor verdeckte '
        '<b>Sinustachykardie</b> mit P-Welle vor jedem schmalen QRS sichtbar werden.'))

    phase_w = (CW - 12) / 3.0
    zero = tpl({'q': {'a': 0}, 'r': {'a': 0}, 's': {'a': 0},
                'r2': {'a': 0}, 'd': {'a': 0}, 't': {'a': 0},
                'u': {'a': 0}, 'st': 0, 'spike': 0})
    phases = Table([[
        Strip(phase_w, 92, tpl({'t': {'c': 0.185, 'w': 0.040, 'a': 0.18}}),
              p_amp=0, rate=180, seconds=1.55,
              label='1  Reentry-SVT: 180/min'),
        Strip(phase_w, 92, zero, p_amp=0.14, rate=130, seconds=1.55,
              label='2  AV-Block: nur P-Wellen'),
        Strip(phase_w, 92, tpl({}), p_amp=0.14, rate=130, seconds=1.55,
              label='3  Sinustachykardie: 130/min'),
    ]], colWidths=[phase_w, phase_w, phase_w])
    phases.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (-1, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    o.append(KeepTogether([
        phases,
        caption('Adenosin-Sequenz, idealisiert: Reentry-SVT, kurzzeitig '
                'isolierte P-Wellen und anschließend demaskierte Sinustachykardie.')
    ]))
    o.append(bullets([
        ('Phase 1 -', 'Die regelmäßige schmale Reentry-SVT läuft mit etwa 180/min. '
                      'P-Wellen sind nicht sicher abgrenzbar.'),
        ('Phase 2 -', 'Adenosin blockiert den AV-Knoten vorübergehend. Die '
                      'Sinus-P-Wellen laufen weiter, werden aber kurz nicht auf '
                      'die Kammern übergeleitet.'),
        ('Phase 3 -', 'Der Reentry-Kreis ist beendet. Wegen Schmerz, Stress, Fieber '
                      'oder einer anderen Ursache kann der Sinusknoten weiter '
                      'schnell feuern - jetzt als erkennbare Sinustachykardie.'),
    ], colour=VIOLET_DK))
    o.append(Spacer(1, 8))
    o.append(box('bad', 'Keine Flatline',
                 '<b>P-Wellen ohne QRS sind keine Asystolie.</b> Sie zeigen '
                 'elektrische Vorhofaktivität bei vorübergehend blockierter '
                 'AV-Überleitung. Trotzdem immer den Patienten und den Puls '
                 'beurteilen, nicht nur den Monitor.'))

    o.append(sec('4.4 Selbsttest'))
    o.append(table(
        ['Beobachtung', 'Deutung'],
        [['Regelmäßige schmale SVT nach erfolglosem Vagusmanöver',
          'Bei stabilem Erwachsenen: erste Adenosin-Dosis 6 mg'],
         ['P-Wellen ohne QRS direkt nach der Gabe',
          'Transiente AV-Blockierung bei weiterlaufender Vorhofaktivität'],
         ['Danach P vor jedem schmalen QRS bei 130/min',
          'Demaskierte Sinustachykardie; Ursache der Sinusfrequenz behandeln'],
         ['Tachykardie wird nur kurz langsamer, Vorhofwellen werden sichtbar',
          'An atriale Tachykardie oder Vorhofflattern denken']],
        widths=[205, CW - 205]))
    o.append(Spacer(1, 12))
    o.append(Paragraph(
        '<font name="Nunito-Black">Leitlinienquelle:</font> European '
        'Resuscitation Council Guidelines 2025, Adult Advanced Life Support, '
        'Kapitel „Management of tachyarrhythmia". Dosierung: 6 mg, danach '
        '12 mg; 18 mg kann anschließend erwogen werden.', S['cap']))
    return o


# =====================================================================
#  KAPITEL 5 - NACHSCHLAGEN
# =====================================================================

def kapitel5():
    o = [PageBreak()]
    o += chapter(5, 'Auf einen Blick', 'Zum Nachschlagen und Wiederholen',
                 VIOLET)

    o.append(sec('5.1 Normwerte'))
    o.append(table(
        ['Größe', 'Normwert', 'Auffällig, wenn'],
        [['P-Welle', 'bis 0,10 s, unter 0,25 mV', 'breiter, höher oder doppelgipflig'],
         ['PQ-Zeit', '120–200 ms', 'über 200 ms: AV-Block; unter 120 ms: Präexzitation'],
         ['QRS-Komplex', '60–100 ms', '100–120 ms inkompletter, ab 120 ms kompletter Block'],
         ['Q-Zacke', 'schmal, unter ¼ der R-Zacke', 'ab 0,04 s oder über ¼ der R-Zacke'],
         ['QTc', 'unter 440 ms (m) / 460 ms (w)', 'darüber: Torsade-Risiko'],
         ['Herzfrequenz', '60–100/min', 'darunter Bradykardie, darüber Tachykardie'],
         ['Umschlagzone', 'V3 bis V4', 'verschoben: Rechts- oder Linksdrehung'],
         ['ST-Strecke', 'auf der Nulllinie', 'ab 0,1 mV Hebung (V2/V3: 0,2 mV)']],
        widths=[104, 150, CW - 254]))

    o.append(Spacer(1, 16))
    o.append(sec('5.2 Papiergeschwindigkeit'))
    o.append(table(
        ['', '1 mm (kleines Kästchen)', '5 mm (großes Kästchen)', 'Frequenzformel'],
        [['25 mm/s', '0,04 s', '0,20 s', '300 ÷ große Kästchen'],
         ['50 mm/s', '0,02 s', '0,10 s', '600 ÷ große Kästchen']],
        widths=[70, 135, 130, CW - 335]))
    o.append(Spacer(1, 8))
    o.append(box('warn', 'Immer zuerst prüfen',
                 'In Deutschland und Luxemburg wird meist mit <b>50 mm/s</b> '
                 'geschrieben, international häufiger mit 25 mm/s. Wer die falsche '
                 'Formel nimmt, verrechnet sich um den Faktor 2. Senkrecht gilt '
                 'unabhängig davon immer: <b>10 mm = 1 mV</b>.'))

    o.append(sec('5.3 Der systematische Befund in sieben Schritten'))
    o.append(p('Der häufigste Befundungsfehler ist nicht fehlendes Wissen, sondern '
               'fehlende Systematik: Man sieht die auffällige ST-Hebung und übersieht '
               'darüber den AV-Block. Arbeite deshalb immer dieselbe Liste ab.'))
    o.append(bullets([
        ('1  Rhythmus —', 'regelmäßig oder unregelmäßig?'),
        ('2  Frequenz —', 'wie schnell? (300er- bzw. 600er-Regel)'),
        ('3  P-Wellen —', 'vorhanden? Vor jedem QRS-Komplex? Immer gleich geformt?'),
        ('4  PQ-Zeit —', '120–200 ms? Konstant?'),
        ('5  QRS-Komplex —', 'schmal oder breit? R-Aufbau regelrecht?'),
        ('6  ST und T —', 'Hebung, Senkung, Negativierung?'),
        ('7  Lagetyp und QT-Zeit —', 'zum Schluss.'),
    ], colour=VIOLET_DK))
    o.append(Spacer(1, 12))
    o.append(box('key', 'Die zwei entscheidenden Fragen im Notfall',
                 '<b>Schnell oder langsam?</b> und <b>schmal oder breit?</b> Diese beiden '
                 'Achsen führen durch fast jeden Rhythmus-Notfall. Und die wichtigste '
                 'Regel daraus: Eine <b>Breitkomplextachykardie ist bis zum Beweis des '
                 'Gegenteils eine ventrikuläre Tachykardie</b>.'))

    o.append(Spacer(1, 18))
    o.append(sec('5.4 Die wichtigsten Merksätze'))
    o.append(bullets([
        ('SA gegen AV —', 'SA-Block: Problem <b>vor</b> der P-Welle, die ganze Aktion '
                          'fehlt. AV-Block: Problem <b>nach</b> der P-Welle, die P-Welle '
                          'bleibt sichtbar.'),
        ('Schenkelblock in V1 —', 'Zeigt der Komplex nach <b>oben</b> (M-Form): '
                                  '<b>Rechts</b>schenkelblock. Zeigt er nach <b>unten</b> '
                                  '(QS): <b>Links</b>schenkelblock.'),
        ('Breite S-Zacke in I und V6 —', 'gehört zum <b>Rechts</b>schenkelblock.'),
        ('ST-Hebung —', 'aus dem absteigenden R: Infarkt. Aus dem aufsteigenden S: '
                        'Perikarditis.'),
        ('Kalium —', '<b>Hyper</b>: hohe, spitze, zeltförmige T-Welle. <b>Hypo</b>: '
                     'flaches T mit U-Welle.'),
        ('Elektrodenfarben —', 'Ampel im Uhrzeigersinn: rot am rechten Arm, gelb am '
                               'linken Arm, grün am linken Fuß. Schwarz bleibt übrig '
                               '(rechter Fuß).'),
        ('Wenckebach —', '„wird länger und länger, bis er weg ist." Mobitz II: '
                         '„aus heiterem Himmel."'),
    ], colour=HEART_DK))

    o.append(Spacer(1, 20))
    o.append(Rule(CW, LINE, 1.4))
    o.append(Spacer(1, 14))
    o.append(box('key', 'Weiterüben',
                 'Alle Befunde aus diesem Skript gibt es auf der Website als laufende '
                 'Kurve — dazu Übungsaufgaben, ein Nachschlagewerk und ein Labor, in dem '
                 'du PQ-Zeit, QRS-Breite und ST-Strecke selbst verstellen kannst. '
                 'Wiedererkennen lernt man nur am bewegten Bild.'))
    o.append(Spacer(1, 12))
    o.append(Paragraph(
        '<font name="Nunito-Black">Quelle der Inhalte:</font> Kursunterlage nach '
        '„EKG-Kurs für Isabel" (Thieme Verlag, 9. Auflage), überarbeitet und ergänzt. '
        'Alle EKG-Abbildungen in diesem Skript wurden eigens rechnerisch erzeugt.',
        S['cap']))
    return o


# =====================================================================
#  BUILD
# =====================================================================

def glue_captions(story):
    """Abbildung und Bildunterschrift nie über den Seitenrand trennen."""
    out, i = [], 0
    figs = (Strip, LeadGrid, BeatDetail, Cabrera)
    while i < len(story):
        cur = story[i]
        nxt = story[i + 1] if i + 1 < len(story) else None
        if (isinstance(cur, figs) and isinstance(nxt, Paragraph)
                and getattr(nxt.style, 'name', '') == 'cap'):
            out.append(KeepTogether([cur, nxt]))
            i += 2
            continue
        out.append(cur)
        i += 1
    return out


def build(path):
    doc = Doc(path, title='EKG ++ — Kursskript', author='Resqly Academy',
              subject='Interaktiver EKG-Kurs — Begleitskript')
    story = []
    story += cover_flowables()
    story += build_toc()
    story += kapitel1()
    story += kapitel1b()
    story += kapitel1c()
    story += kapitel2()
    story += kapitel2b()
    story += kapitel3()
    story += kapitel4()
    story += kapitel5()
    story = glue_captions(story)

    # Erste Seite ohne Kopf-/Fußzeile, danach mit.
    from reportlab.platypus import NextPageTemplate
    story.insert(0, NextPageTemplate('content'))
    doc.multiBuild(story)
    return doc.page


if __name__ == '__main__':
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else 'EKG-Skript.pdf'
    n = build(out)
    print('geschrieben:', out, '/ Seiten:', n)
    if _MISSING_GLYPHS:
        print('WARNUNG — diese Zeichen fehlen in Nunito und werden im PDF '
              'nicht dargestellt:', ' '.join(sorted(_MISSING_GLYPHS)))
        sys.exit(1)
