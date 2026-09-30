import React from 'react';
import AgreementForm from '../forms/agreementForm';
const AntiSocialForcesPolicy = ({userProfile,agreementType}) => {
const agreementContent = (
  `
  <div>
    <section>
        <h4>1. Prohibition on Transactions with Anti-Social Forces</h4>
        <p>
          Eljawad Motors Ltd. (hereinafter referred to as “the Company”) enforces a strict policy against any dealings, affiliations, or interactions with individuals or entities connected to anti-social force. This includes, but is not limited to, criminal organizations, violent groups, or those associated with such entities (hereinafter referred to as “Anti-Social Forces”).
        </p>
      </section>
      <section>
        <h4>2. Definition of Anti-Social Forces</h4>
        <p>
          For the purposes of this policy, Anti-Social Forces are defined as any individuals or organizations that fall within the following categories:
        </p>
        <ul>
          <li>Criminal syndicates</li>
          <li>Current or former members of criminal organizations</li>
          <li>Businesses or persons with ties to criminal syndicates</li>
          <li>Groups or individuals who engage in coercive or violent activities under the guise of social activism</li>
          <li>Any other individuals or groups involved in illegal or unethical actions intended to disrupt social order or seek profits through threats or violence</li>
        </ul>
      </section>
      <section>
        <h4>3. Non-Engagement Commitment</h4>
        <p>
          The Company unequivocally refuses to engage in or support any activities, agreements, or business relationships that involve Anti-Social Forces. This policy applies to all forms of interaction, including sales, collaborations, investments, and any contractual agreements.
        </p>
      </section>
      <section>
        <h4>4. User Declarations and Warranties</h4>
        <p>
          By using the Company’s platform, users affirm and guarantee that they are not, and will not become, associated with Anti-Social Forces. Furthermore, users confirm that they do not maintain any connections or conduct transactions with such entities. Violation of this clause will result in the immediate termination of the user’s account, with all related transactions annulled without prior notice.
        </p>
      </section>
      <section>
        <h4>5. Prohibited Actions</h4>
        <ul>
          <li>Providing financial support or resources to Anti-Social Forces</li>
          <li>Facilitating the direct or indirect use of the Company’s services by Anti-Social Forces</li>
          <li>Assisting in concealing the identity or involvement of Anti-Social Forces in order to access the Company’s services</li>
        </ul>
      </section>
      <section>
        <h4>6. Termination of Services</h4>
        <p>
          If it is discovered that a user is involved with Anti-Social Forces or there is reasonable suspicion of such involvement, the Company reserves the right to:
        </p>
        <ul>
          <li>Immediately suspend or terminate the user’s access to its platform without notice</li>
          <li>Void any existing contracts, agreements, or transactions with the user</li>
          <li>Decline any future business or interaction with the user</li>
        </ul>
      </section>
      <section>
        <h4>7. Safety and Compliance Measures</h4>
        <p>
          The Company will implement the following steps to ensure adherence to this Anti-Social Forces Policy:
        </p>
        <ul>
          <li>Conduct thorough due diligence and background checks on users, partners, and business entities before formal relationships are established</li>
          <li>Put in place internal controls to prevent any direct or indirect association with Anti-Social Forces</li>
          <li>Collaborate with law enforcement and relevant authorities to safeguard the integrity of its business practices and ensure compliance with this policy</li>
        </ul>
      </section>
      <section>
        <h4>8. Limitation of Liability for Termination</h4>
        <p>
          The Company bears no responsibility for any loss or damage incurred by users resulting from service suspension or contract cancellations arising from a violation of this Anti-Social Forces Policy.
        </p>
      </section>
      <section>
        <h4>9. Cooperation with Law Enforcement</h4>
        <p>
          The Company will fully cooperate with law enforcement agencies, regulatory bodies, and other relevant authorities to prevent Anti-Social Forces from utilizing the Company’s platform or services.
        </p>
      </section>
      <section>
        <h4>10. User Responsibility to Report</h4>
        <p>
          Users are required to immediately notify the Company if they become aware of any Anti-Social Forces-related activities involving themselves or other users. Failure to report such activities will result in the immediate suspension or termination of the user’s account.
        </p>
      </section>
      <section>
        ${
          agreementType === 'Anti-Social Forces Policy' 
            ? `<h4 style="color: red;">Important Notice:</h4>
              <p>
                <span style="font-weight:bold;">I hereby confirm:</span><br />
                I am not connected with any individuals or groups that can be determined as Anti-Social Forces (ASF).<br />
                The goods will not be used for any prohibited purposes, as specified in these policies.<br />
                I guarantee that my activities do not violate international law, and I am not engaged in nor do I plan to engage in any circumvention of sanctions.
              </p>`
            : ""
        }
      </section>

  </div>
  `
);
  return (
    <div className='asf'>
      {userProfile ? <h1>Anti-Social Forces Policy</h1>: <h4>Anti-Social Forces Policy</h4>}
      <div dangerouslySetInnerHTML={{ __html: agreementContent }} />
      {userProfile && <AgreementForm agreementType={agreementType} agreementContent={agreementContent} />}
      
    </div>
  );
};

export default AntiSocialForcesPolicy;
