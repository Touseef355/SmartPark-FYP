export default function ManualEntryForm({ type }) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">
          Manual {type === 'entry' ? 'Entry' : 'Exit'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Manual form coming soon...
        </p>
      </div>
    )
  }