/**
 * Index — /onboarding route
 *
 * Renders the unified onboarding flow (name → grading system → class →
 * target → subjects).  On completion saves the full AppState and
 * navigates to /.
 *
 * The /planner route also points here for backward-compatibility with
 * existing deep-links.
 */

import SimpleOnboarding from "@/components/SimpleOnboarding";

const Index = () => <SimpleOnboarding />;

export default Index;
