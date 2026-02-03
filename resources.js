// Fun fact, the 7:1 ratio is a misconception
// https://www.akc.org/expert-advice/health/how-to-calculate-dog-years-to-human-years/
function calculateHumanAge(dogAge) {
	if (dogAge === 1) {
		return 15; // 15 years for year 1
	} else if (dogAge === 2) {
		return 24; // +9 for year 2
	} else {
		return 24 + 5 * (dogAge - 2); // +5 for every year after
	}
}

export class DogWithHumanAge extends tables.Dog {
	static loadAsInstance = false;
	async get(target) {
		logger.info('Hello from inside DogWithHumanAge!');

		const dogRecord = await super.get(target);

		console.log('dogRecord', dogRecord);

		return {
			...dogRecord,
			humanAge: calculateHumanAge(dogRecord.age),
		}
	}
}