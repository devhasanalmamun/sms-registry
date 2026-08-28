import { LinkButton, Panel } from "@/components/registry";

export default function NotFound() {
  return (
    <Panel className="mx-auto max-w-xl px-6 py-10 text-center">
      <p className="colhead text-dim">Not found</p>
      <h1 className="mt-2 font-semibold text-2xl">There is no record here.</h1>
      <p className="mt-3 text-sm text-graphite">
        The student, assessment or file you asked for does not exist — or it has
        been removed since the link was made.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <LinkButton variant="default" href="/">
          Back to Today
        </LinkButton>
        <LinkButton href="/students" variant="outline">
          Search the register
        </LinkButton>
      </div>
    </Panel>
  );
}
