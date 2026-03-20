interface ContentParseErrorProps {
  context: 'student' | 'teacher';
}

export function ContentParseError({ context }: ContentParseErrorProps) {
  if (context === 'student') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p>
          This content could not be loaded. Please ask your teacher to
          regenerate this section.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
      <p>
        This content could not be parsed. Try regenerating it from the Edit
        view.
      </p>
    </div>
  );
}
