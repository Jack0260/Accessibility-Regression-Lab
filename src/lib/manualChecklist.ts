// WCAG 2.2 AA manual checklist — covers criteria that automated
// tools like axe-core cannot fully verify. Each item includes
// guidance for testers.

export interface ChecklistCriterion {
  id: string;
  title: string;
  category: string;
  description: string;
  howToTest: string;
}

export const MANUAL_CHECKLIST: ChecklistCriterion[] = [
  // Perceivable
  {
    id: '1.1.1d',
    title: 'Meaningful text alternatives',
    category: 'Perceivable',
    description: 'Non-text content has appropriate text alternatives that convey the same meaning.',
    howToTest: 'Review images, icons, and graphics. Are alt text descriptions meaningful and accurate? Decorative images should have empty alt.',
  },
  {
    id: '1.2.2',
    title: 'Captions for prerecorded media',
    category: 'Perceivable',
    description: 'Captions are provided for all prerecorded audio content in synchronized media.',
    howToTest: 'Play video content. Are captions available and accurate? Do they include dialogue and important sound cues?',
  },
  {
    id: '1.2.3',
    title: 'Audio description or media alternative',
    category: 'Perceivable',
    description: 'An alternative for time-based media or audio description is provided for prerecorded video.',
    howToTest: 'Is there an audio description track or text transcript for video-only content?',
  },
  {
    id: '1.2.5',
    title: 'Audio description for prerecorded',
    category: 'Perceivable',
    description: 'Audio description is provided for all prerecorded video content in synchronized media.',
    howToTest: 'Check for audio description track. Does it describe important visual information not in dialogue?',
  },
  {
    id: '1.4.1',
    title: 'Use of color',
    category: 'Perceivable',
    description: 'Color is not used as the only visual means of conveying information.',
    howToTest: 'Check links, errors, and status indicators. Is information conveyed through text or icons in addition to color?',
  },
  {
    id: '1.4.4',
    title: 'Text resize',
    category: 'Perceivable',
    description: 'Text can be resized up to 200% without loss of content or functionality.',
    howToTest: 'Zoom to 200% in browser. Is all text readable and functional? Does any content get cut off or overlap?',
  },
  {
    id: '1.4.5',
    title: 'Images of text',
    category: 'Perceivable',
    description: 'Images of text are avoided except for pure decoration or where a particular presentation is essential.',
    howToTest: 'Look for text rendered as images. Could it be real text instead? Logos and branding are exceptions.',
  },
  {
    id: '1.4.10',
    title: 'Reflow on small screens',
    category: 'Perceivable',
    description: 'Content reflows at 320px width without horizontal scrolling.',
    howToTest: 'Resize browser to 320px width. Does content reflow? Is there horizontal scrolling for content?',
  },
  {
    id: '1.4.11',
    title: 'Non-text contrast',
    category: 'Perceivable',
    description: 'The visual presentation of UI components and graphical objects has a contrast ratio of at least 3:1.',
    howToTest: 'Check borders, icons, form field borders, and focus indicators. Do they meet 3:1 contrast?',
  },
  {
    id: '1.4.12',
    title: 'Text spacing',
    category: 'Perceivable',
    description: 'No loss of content or functionality occurs when users override text spacing.',
    howToTest: 'Use a text spacing bookmarklet or extension to override spacing. Does content remain usable?',
  },

  // Operable
  {
    id: '2.1.1d',
    title: 'Keyboard accessibility',
    category: 'Operable',
    description: 'All functionality is operable from the keyboard without time limits.',
    howToTest: 'Unplug mouse. Navigate entire page with Tab, Shift+Tab, Enter, Space, and arrow keys. Can you reach and operate all controls?',
  },
  {
    id: '2.1.2',
    title: 'No keyboard traps',
    category: 'Operable',
    description: 'Focus can be moved away from any component using only keyboard interfaces.',
    howToTest: 'Tab into modals, menus, and embedded content. Can you Tab out? Are there any traps?',
  },
  {
    id: '2.1.4',
    title: 'Character key shortcuts',
    category: 'Operable',
    description: 'Single-character shortcuts can be turned off or remapped.',
    howToTest: 'Are there single-character shortcuts? Can they be disabled or remapped by the user?',
  },
  {
    id: '2.2.1',
    title: 'Timing adjustable',
    category: 'Operable',
    description: 'Users can turn off, adjust, or extend time limits.',
    howToTest: 'Are there time limits on the page? Can users turn them off, adjust, or extend? Is there a warning before timeout?',
  },
  {
    id: '2.3.1d',
    title: 'Three flashes or below threshold',
    category: 'Operable',
    description: 'Content does not contain anything that flashes more than three times per second.',
    howToTest: 'Look for animated or video content. Does anything flash rapidly? Could it trigger seizures?',
  },
  {
    id: '2.4.1',
    title: 'Bypass blocks',
    category: 'Operable',
    description: 'A mechanism is available to bypass blocks of content that are repeated on multiple pages.',
    howToTest: 'Is there a skip-to-content link? Does it work? Can keyboard users skip repetitive navigation?',
  },
  {
    id: '2.4.5',
    title: 'Multiple ways to find pages',
    category: 'Operable',
    description: 'More than one way is available to locate a web page within a set of pages.',
    howToTest: 'Can you find pages via navigation, search, sitemap, or links? At least two methods should exist.',
  },
  {
    id: '2.4.7d',
    title: 'Focus visibility',
    category: 'Operable',
    description: 'Any keyboard operable user interface has a visible focus indicator.',
    howToTest: 'Tab through all interactive elements. Is the focus always clearly visible? Is it not removed via CSS?',
  },
  {
    id: '2.5.3',
    title: 'Label in name',
    category: 'Operable',
    description: 'For user interface components with labels, the visible label contains the accessible name.',
    howToTest: 'For buttons and links with visible text, check that the accessible name matches or contains the visible text.',
  },
  {
    id: '2.5.4',
    title: 'Motion actuation',
    category: 'Operable',
    description: 'Functionality triggered by moving a device or gesturing can also be operated with a UI component.',
    howToTest: 'Are there shake, tilt, or gesture controls? Can the same actions be performed with buttons or other controls?',
  },

  // Understandable
  {
    id: '3.1.2',
    title: 'Language of parts',
    category: 'Understandable',
    description: 'The human language of each passage or phrase is programmatically determined.',
    howToTest: 'Are there foreign language phrases? Do they have lang attributes? Screen readers need this for correct pronunciation.',
  },
  {
    id: '3.2.3',
    title: 'Consistent navigation',
    category: 'Understandable',
    description: 'Navigational mechanisms repeated on multiple pages occur in the same relative order.',
    howToTest: 'Compare navigation across pages. Is the order consistent? Changes should be user-initiated.',
  },
  {
    id: '3.2.4',
    title: 'Consistent identification',
    category: 'Understandable',
    description: 'Components that have the same functionality are identified consistently.',
    howToTest: 'Are similar features labeled the same way across pages? Search boxes, login buttons, etc. should be consistent.',
  },
  {
    id: '3.3.1d',
    title: 'Error identification',
    category: 'Understandable',
    description: 'Errors are automatically detected and described to the user in text.',
    howToTest: 'Submit forms with invalid data. Are errors identified in text? Are they clear and specific?',
  },
  {
    id: '3.3.3',
    title: 'Error suggestion',
    category: 'Understandable',
    description: 'If an error is detected, suggestions for fixing it are provided to the user.',
    howToTest: 'When errors occur, are corrections suggested? Are suggestions helpful and non-threatening?',
  },
  {
    id: '3.3.4',
    title: 'Error prevention (legal/financial)',
    category: 'Understandable',
    description: 'For submissions that cause legal or financial commitments, users can reverse, check, or confirm.',
    howToTest: 'For purchases and legal forms, can users review, correct, or cancel before submission is final?',
  },

  // Robust
  {
    id: '4.1.3',
    title: 'Status messages',
    category: 'Robust',
    description: 'Status messages can be programmatically determined through role or properties.',
    howToTest: 'Trigger status messages (success, errors, progress). Are they announced to screen readers via ARIA live regions?',
  },
];
