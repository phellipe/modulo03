import Bee from 'bee-queue';
import * as Sentry from '@sentry/node';
import sentryConfig from '../config/sentry';
import CancellationMail from '../app/jobs/CancellationMail';

import redisConfig from '../config/redis';

Sentry.init(sentryConfig);

const jobs = [CancellationMail];

class Queue {
  constructor() {
    this.queues = {};

    this.init();
  }

  init() {
    jobs.forEach(({ key, handle }) => {
      this.queues[key] = {
        bee: new Bee(key, {
          redis: {
            redisConfig,
          },
        }),
        handle,
      };
    });
  }

  add(queue, job) {
    return this.queues[queue].bee.createJob(job).save();
  }

  processQueue() {
    jobs.forEach(job => {
      const { bee, handle } = this.queues[job.key];

      bee.on('failed', this.handleFailure).process(handle);
    });
  }

  handleFailure(job, err) {
    // if (process.env.NODE_ENV === 'development') {
    console.log(`Queue ${job.queue.name}: FAILED`, err);
    // }

    Sentry.captureException(err);
  }
}

export default new Queue();
