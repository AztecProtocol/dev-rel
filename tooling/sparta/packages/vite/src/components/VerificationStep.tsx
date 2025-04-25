import React /*, { type ReactNode } */ from 'react'; // ReactNode unused
// import { StepStatus } from '@reown/react-components/ProgressSteps'; // Source unknown or missing
import { Button } from './Button.jsx'; // Changed to named import
// import { CheckCircle, XCircle } from './Icons/index.jsx'; // Removed icon import for now

interface VerificationResult {
	success?: boolean;
	inProgress?: boolean;
	message: string;
	score?: number;
	minimumScore?: number;
	details?: string;
}

interface VerificationStepProps {
	// number: number; // Unused
	title: string;
	description: string;
	isActive: boolean;
	isCompleted: boolean;
	buttonText?: string;
	onButtonClick?: () => void;
	showButton?: boolean;
	buttonDisabled?: boolean;
	isLoading?: boolean;
	result?: VerificationResult; // Keep original result prop
	completedContent?: React.ReactNode; // Added prop for custom completed content
	failureContent?: React.ReactNode; // Added: Content to show on failure
	// details?: ReactNode; // Comment out details as it wasn't in original props
}

const VerificationStep: React.FC<VerificationStepProps> = ({
	title,
	description,
	isActive,
	isCompleted,
	buttonText,
	onButtonClick,
	showButton = true,
	buttonDisabled = false,
	isLoading = false,
	result, // Keep original result prop
	completedContent, // Added prop for custom completed content
	failureContent, // Added
	// details, // Comment out details
}) => {
	// Determine the step number based on the title (simple example)
	const stepNumber = title.toLowerCase().includes("connect") ? 1 : 2;

	const stepIcon = isCompleted ? (
		<span className="icon check">✓</span> // Use text checkmark
	) : failureContent ? (
		<span className="icon cross">✗</span> // Use text cross
	) : (
		<div className={`step-number ${isActive ? 'active' : ''}`}>{stepNumber}</div>
	);

	const stepClass = `step ${isActive ? "active" : ""} ${
		isCompleted ? "completed" : ""
	} ${failureContent ? 'failed' : ''}`;

	return (
		<div className={stepClass}>
			<div className="step-header">
				{stepIcon}
				<h3>{title}</h3>
			</div>

			{/* Conditionally render completed content or original description/button */} 
			{isCompleted ? (
				completedContent ? completedContent : <p>Step Completed</p>
			) : failureContent ? ( // Added: Render failure content
				failureContent
			) : (
				<>
					<p>{description}</p>
					{showButton && buttonText && (
						<Button
							variant="purple"
							onClick={onButtonClick}
							disabled={buttonDisabled || isLoading}
						>
							{isLoading ? <span className="spinner mr-2"></span> : null}
							{buttonText}
						</Button>
					)}
				</>
			)}

			{result && (
				<div
					className={
						result.success
							? "success"
							: result.inProgress
							? ""
							: "error"
					}
				>
					<h3>
						{result.success ? "✓" : result.inProgress ? "⏳" : "❌"}{" "}
						{result.message}
					</h3>

					{result.score !== undefined && (
						<p>Your Passport score: {result.score}</p>
					)}

					{result.minimumScore !== undefined && (
						<p>Required minimum score: {result.minimumScore}</p>
					)}

					{result.details && <p>{result.details}</p>}
				</div>
			)}
		</div>
	);
};

export default VerificationStep;
