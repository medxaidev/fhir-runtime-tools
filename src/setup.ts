import {
  createInteractionRuntime,
  createPageModule,
  createNotificationModule,
} from '@prismui/core';

export const runtime = createInteractionRuntime({
  modules: [
    createPageModule(),
    createNotificationModule({ maxNotifications: 50 }),
  ],
});
