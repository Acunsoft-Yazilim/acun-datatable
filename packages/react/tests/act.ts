// `act` is exported by `react` from React 18.3; React 18.2, the oldest
// supported version (the lowest-versions CI job), has it in react-dom/test-utils only.
import * as React from 'react';
import * as TestUtils from 'react-dom/test-utils';

export const act: typeof React.act = (React as Partial<typeof React>).act ?? (TestUtils as unknown as { act: typeof React.act }).act;
