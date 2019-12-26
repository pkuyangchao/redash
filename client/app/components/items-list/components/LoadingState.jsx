import React from 'react';
import { BigMessage } from '@/components/BigMessage';

// Default "loading" message for list pages
export default function LoadingState(props) {
  return (
    <div className="text-center">
      <BigMessage icon="fa-spinner fa-2x fa-pulse" message="正在载入中，请稍等..." {...props} />
    </div>
  );
}
