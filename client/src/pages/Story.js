import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageState, Placeholder } from "../components/Bits";
import Moon from "../components/Moon";
import Ornament from "../components/Ornament";
import { useCatalog } from "../hooks/useCatalog";
import { useLang } from "../i18n/LangContext";

export default function Story() {
  const { catalog, error } = useCatalog();
  const { t } = useLang();

  useEffect(() => {
    document.title = t("Our Story · Original Ornaments", "이야기 · Original Ornaments");
  }, [t]);

  if (!catalog) return <PageState error={error} />;
  const y = catalog.year;

  return (
    <>
      <section className="oo-container py-20 text-center sm:py-28">
        <p className="oo-eyebrow">Our story</p>
        <h1 className="oo-hero mt-6">Collect the Lights.</h1>
        <p className="mx-auto mt-8 max-w-[48rem] font-display text-xl leading-relaxed font-light text-strong sm:text-2xl">

          {t(
            "Mother-of-pearl doesn't shine on its own. It takes the light it's given and returns it as a rainbow. We make objects that hold the light of your year in a single piece of shell.",
            "자개는 스스로 빛나지 않습니다. 받은 빛을 무지개색으로 돌려줄 뿐입니다. 우리는 한 해 동안 당신이 받은 빛을, 자개 하나에 담아 간직하는 오브제를 만듭니다."
          )}
        </p>
      </section>

      <section className="bg-burgundy py-20 sm:py-28">
        <div className="oo-container grid items-center gap-12 md:grid-cols-[1fr_minmax(0,27.5rem)] lg:gap-24">
          <div>
            <p className="oo-eyebrow">Your {y} light</p>
            <h2 className="oo-h2 mt-4">{t(`Keep the light that found you in ${y}`, `${y}년, 당신에게 온 빛을 간직하세요`)}</h2>
            <p className="oo-lead mt-5 max-w-[33rem] text-body sm:text-[1.0625rem]">
              {t(
                "A child given a new name. The first morning you unlocked your own shop. Walking again. The letter you waited years for. Every year holds one light you never want to forget. Choose the ornament that feels like it, and hang it on your tree. One a year, your lights add up.",
                "새 이름을 얻은 아이, 처음 열어 본 내 가게의 문, 다시 걷게 된 아침, 오래 기다린 합격 소식. 한 해에는 저마다 잊고 싶지 않은 빛이 하나쯤 있습니다. 그 빛을 닮은 오너먼트를 골라 트리에 거세요. 해마다 하나씩, 당신의 빛이 쌓입니다."
              )}
            </p>
          </div>
          <Placeholder
            label={t(
              "Photo\nThree mother-of-pearl ornaments hanging on a Christmas tree",
              "사진\n트리 가지에 걸린 자개 오너먼트 세 개"
            )}
            className="aspect-[4/5] !bg-dark"
          />
        </div>
      </section>

      <section className="bg-black py-20 sm:py-28">
        <div className="oo-container">
          <p className="oo-eyebrow">{catalog.collection}</p>
          <h2 className="oo-h2 mt-4 max-w-[50rem] sm:!text-5xl sm:!leading-tight">
            {t("Four chapters, from Christmas Eve to the cathedral of light", "이브의 낮에서 빛의 성당까지, 네 개의 챕터")}
          </h2>
          <p className="oo-lead mt-4 max-w-[51rem] text-body">
            {t(
              "From the day of Christmas Eve to that night, the next morning, and a cathedral of light: four chapters, sixteen lights.",
              "크리스마스 이브의 낮부터 그날 밤, 다음 날 아침, 그리고 빛의 성당까지. 네 개의 장에 열여섯 개의 빛을 담았습니다."
            )}
          </p>
          <div className="mt-12 h-px bg-gradient-to-r from-transparent via-burgundy to-gold" />

          <div className="mt-10 grid gap-x-10 gap-y-14 md:grid-cols-2">
            {catalog.chapters.map((chapter) => (
              <ChapterVideo key={chapter.slug} chapter={chapter} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-deep py-20 sm:py-28">
        <div className="oo-container grid items-center gap-12 md:grid-cols-[17fr_13fr] lg:gap-16">
          <Placeholder label={t("Macro photo of finished nacre grain", "완성품 자개 결 매크로 사진")} className="aspect-[3/2]" />
          <div>
            <p className="oo-eyebrow">One of a kind</p>
            <h2 className="oo-h2 mt-4">{t("Same design, different light", "같은 디자인, 다른 빛")}</h2>
            <p className="oo-lead mt-5 text-body">
              {t(
                "Nacre is built by a shell, layer by layer, over years. The direction of the grain, where the rainbow shows, every fine line and fleck differs from shell to shell. Put two CATs side by side and their light will never match. That small difference from the photo is how you know it is yours.",
                "자개는 조개가 몇 년에 걸쳐 쌓아 올린 층입니다. 결의 방향, 무지개빛이 도는 자리, 가는 선과 점은 조개마다 다릅니다. 그래서 같은 CAT을 두 개 놓아도 똑같은 빛은 없습니다. 사진과 조금 다른 그 차이가, 당신의 것이라는 표시입니다."
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-dark py-20 sm:py-28">
        <div className="oo-container grid items-center gap-12 md:grid-cols-[minmax(0,24rem)_1fr] lg:gap-24">
          <Moon className="mx-auto w-full max-w-sm md:mx-0 md:pl-8" dark="bg-deep" />
          <div>
            <p className="oo-eyebrow">The mark</p>
            <h2 className="oo-h2 mt-4">{t("Two circles, one moon", "두 개의 원, 하나의 달")}</h2>
            <p className="oo-lead mt-5 max-w-md text-body">
              {t(
                'The two circles in our mark are the "OO" of Original Ornaments. Where they overlap, a crescent appears: a reminder that even on the longest night, the light keeps growing.',
                '로고의 두 원은 Original Ornaments의 "OO"입니다. 두 원이 겹치는 자리에 초승달이 생깁니다. 가장 긴 밤에도 빛은 조금씩 차오른다는 뜻을 담았습니다.'
              )}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function ChapterVideo({ chapter }) {
  const { t, pick } = useLang();
  // Video cover: the chapter's cover design (from the guideline) until the 15-second film exists
  const cover = chapter.designs.find((d) => d.slug === chapter.cover) ?? chapter.designs[0];
  return (
    <article>
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden border border-dark bg-[radial-gradient(circle,#3a1820,#0b0b0b_75%)]">
        <span className="oo-micro absolute top-3 left-3 !text-[11px]">{t("[Video cover image]", "[영상 대표 이미지]")}</span>
        <Ornament slug={cover.slug} name={cover.name} className="h-[80%] w-auto" />
        <span
          aria-hidden="true"
          className="absolute flex size-14 items-center justify-center rounded-full border border-gold-line bg-black/45 pl-1 text-xl text-gold"
        >
          ▶
        </span>
        <span className="oo-micro absolute right-3 bottom-3 rounded bg-black/60 px-1.5 !text-strong">0:15</span>
      </div>
      <h3 className="mt-6 flex items-baseline gap-3">
        <span className="font-display text-4xl font-light text-gold italic">{chapter.numeral}</span>
        <span className="font-display text-2xl text-strong">{pick(chapter, "name")}</span>
      </h3>
      <p className="oo-body mt-3 text-body">{pick(chapter, "storyLine")}</p>
      <p className="oo-micro mt-3 uppercase tracking-[0.18em]">
        {chapter.designs.map((d, i) => (
          <span key={d.slug}>
            {i > 0 && " · "}
            <Link to={`/product/${d.slug}`} className="hover:text-gold">
              {d.short || d.name}
            </Link>
          </span>
        ))}
      </p>
    </article>
  );
}
