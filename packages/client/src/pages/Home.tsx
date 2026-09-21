import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export function Home() {
  return (
    <div className="stack">
      <div>
        <h1>Midnight Ballot</h1>
        <p>
          Private, eligibility-gated voting with a publicly verifiable tally. Only allowlisted
          members can vote. Nobody — not even this server — can tell who voted or how. Anyone can
          verify the result.
        </p>
      </div>
      <div className="row">
        <Card>
          <h2>Organizer</h2>
          <p>Create a poll, register voters, open and close voting.</p>
          <Link to="/organizer">
            <Button>Go to Organizer</Button>
          </Link>
        </Card>
        <Card>
          <h2>Voter</h2>
          <p>Generate a private credential and cast your vote.</p>
          <Link to="/vote">
            <Button>Go to Vote</Button>
          </Link>
        </Card>
        <Card>
          <h2>Results</h2>
          <p>Watch the live, publicly verifiable tally. No wallet needed.</p>
          <Link to="/results">
            <Button variant="secondary">View Results</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
