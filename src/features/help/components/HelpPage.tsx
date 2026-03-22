import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function markHelpAsSeen(): void {
  localStorage.setItem("subcoach_help_seen", "true");
}

export function HelpPage(): React.ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleStart = () => {
    markHelpAsSeen();
    navigate("/");
  };

  const handleSkip = () => {
    markHelpAsSeen();
    navigate("/");
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      {/* Header with skip button */}
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={handleSkip}
          className={cn(
            "touch-manipulation rounded-lg px-4 py-2",
            "text-sm font-medium text-muted-foreground",
            "transition-colors hover:text-foreground",
          )}
        >
          {t("help.skip")} →
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Welcome */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            <span className="mr-2">🏆</span>
            {t("help.welcome.title")}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {t("help.welcome.subtitle")}
          </p>
        </div>

        <div className="mx-auto max-w-lg space-y-6">
          {/* Team Setup */}
          <Section emoji="📋" title={t("help.team.title")}>
            <BulletList
              items={[
                t("help.team.item1"),
                t("help.team.item2"),
                t("help.team.item3"),
              ]}
            />
          </Section>

          {/* Match Preparation */}
          <Section emoji="🎯" title={t("help.preparation.title")}>
            <BulletList
              items={[
                t("help.preparation.item1"),
                t("help.preparation.item2"),
                t("help.preparation.item3"),
              ]}
            />
          </Section>

          {/* During Match */}
          <Section emoji="▶️" title={t("help.match.title")}>
            <div className="space-y-4">
              <SubSection emoji="⏱️" title={t("help.match.clock.title")}>
                {t("help.match.clock.description")}
              </SubSection>

              <SubSection emoji="🔄" title={t("help.match.substitution.title")}>
                {t("help.match.substitution.description")}
              </SubSection>

              <SubSection emoji="⚽" title={t("help.match.goalHome.title")}>
                {t("help.match.goalHome.description")}
              </SubSection>

              <SubSection emoji="⚽" title={t("help.match.goalAway.title")}>
                {t("help.match.goalAway.description")}
              </SubSection>

              <SubSection emoji="🟨🟥" title={t("help.match.cards.title")}>
                {t("help.match.cards.description")}
              </SubSection>

              <SubSection emoji="🤕" title={t("help.match.injury.title")}>
                {t("help.match.injury.description")}
              </SubSection>
            </div>
          </Section>

          {/* Suggestions */}
          <Section emoji="💡" title={t("help.suggestions.title")}>
            <p className="text-muted-foreground">
              {t("help.suggestions.description")}
            </p>
            <p className="mt-2 text-muted-foreground">
              {t("help.suggestions.action")}
            </p>
            <p className="mt-3 font-medium text-primary">
              👉 {t("help.suggestions.youDecide")}
            </p>
          </Section>

          {/* Keeper */}
          <Section emoji="🧤" title={t("help.keeper.title")}>
            <BulletList
              items={[t("help.keeper.item1"), t("help.keeper.item2")]}
            />
          </Section>

          {/* Tips */}
          <Section emoji="📱" title={t("help.tips.title")}>
            <BulletList
              items={[
                t("help.tips.item1"),
                t("help.tips.item2"),
                t("help.tips.item3"),
              ]}
            />
          </Section>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-border bg-card p-5">
        <Button
          size="match"
          variant="default"
          className="w-full touch-manipulation bg-field text-lg text-white hover:bg-field/90"
          onClick={handleStart}
        >
          🚀 {t("help.start")}
        </Button>
      </div>
    </div>
  );
}

function Section({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span>{emoji}</span>
        <span>{title}</span>
      </h2>
      {children}
    </div>
  );
}

function SubSection({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div>
      <h3 className="flex items-center gap-2 font-medium">
        <span>{emoji}</span>
        <span>{title}</span>
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }): React.ReactNode {
  return (
    <ul className="space-y-1.5 text-muted-foreground">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-primary">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
