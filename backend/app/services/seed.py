from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session, selectinload

from app.models.nutrition_plan import NutritionPlan
from app.models.plan_meal import PlanMeal
from app.models.plan_period_pricing import PlanPeriodPricing


ALLOWED_PERIODS = [1, 2, 3, 4, 5, 6, 7, 14]
DEFAULT_DAILY_PRICE_BY_GOAL = {
    "weight_loss": 18.9,
    "muscle_gain": 23.9,
    "balanced": 20.5,
    "vegetarian": 19.2,
    "performance": 22.8,
}


def build_pricing_options(
    daily_rate: float, weekly_discount: float = 0.05, biweekly_discount: float = 0.1
) -> list[dict[str, int | str]]:
    """Generate pricing options in cents for supported periods."""
    daily = Decimal(str(daily_rate))
    weekly_multiplier = Decimal("1") - Decimal(str(weekly_discount))
    biweekly_multiplier = Decimal("1") - Decimal(str(biweekly_discount))
    pricing: list[dict[str, int | str]] = []

    for period in ALLOWED_PERIODS:
        multiplier = Decimal(period)
        price = daily * multiplier
        if period == 14:
            price *= biweekly_multiplier
        elif period >= 7:
            price *= weekly_multiplier

        price_cents = int((price * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        pricing.append(
            {
                "period_days": period,
                "price_cents": price_cents,
                "currency": "EUR",
            }
        )
    return pricing


def seed_initial_plans(db: Session) -> None:

    plans_data = [
        {
            "name": "FitBite Slim planas",
            "description": "7 dienų svorio mažinimo planas – daug daržovių, lengvi baltymų šaltiniai, subalansuotos porcijos ir aiškus grafikas visai savaitei.",
            "goal_type": "weight_loss",
            "daily_price": 18.9,
            "calories": 1650,
            "protein_grams": 120,
            "carbs_grams": 155,
            "fats_grams": 55,
            "meals": [
                {
                    "day_of_week": "monday",
                    "meal_type": "breakfast",
                    "title": "Chia pudingas su avietėmis",
                    "description": "Migdolų pieno chia, graikiškas jogurtas, avietės ir šaukštelis medaus.",
                    "calories": 320,
                    "protein_grams": 18,
                    "carbs_grams": 38,
                    "fats_grams": 12,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "lunch",
                    "title": "Kalakutienos salotos su kuskusu",
                    "description": "Kalakutienos file, kuskusas, traškios salotos ir citrininis padažas.",
                    "calories": 430,
                    "protein_grams": 34,
                    "carbs_grams": 42,
                    "fats_grams": 13,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "dinner",
                    "title": "Kepta menkė su brokoliais",
                    "description": "Citrinų sultimis apšlakstyta menkė, garinti brokoliai ir kiaušinių padažas.",
                    "calories": 420,
                    "protein_grams": 36,
                    "carbs_grams": 24,
                    "fats_grams": 18,
                },
                {
                    "day_of_week": "tuesday",
                    "meal_type": "breakfast",
                    "title": "Žalioji smuči",
                    "description": "Špinatai, banana, kivis, avižos ir augalinis baltymų kokteilis.",
                    "calories": 280,
                    "protein_grams": 22,
                    "carbs_grams": 32,
                    "fats_grams": 8,
                },
                {
                    "day_of_week": "tuesday",
                    "meal_type": "lunch",
                    "title": "Mažai angliavandenių turintis burrito dubenėlis",
                    "description": "Ant grotelių kepta vištiena, kalafiorų ryžiai, pupelės, salotos ir salsa.",
                    "calories": 360,
                    "protein_grams": 33,
                    "carbs_grams": 28,
                    "fats_grams": 12,
                },
                {
                    "day_of_week": "tuesday",
                    "meal_type": "snack",
                    "title": "Migdolai ir obuolys",
                    "description": "Lengvas užkandis tarp pietų ir vakarienės.",
                    "calories": 80,
                    "protein_grams": 5,
                    "carbs_grams": 12,
                    "fats_grams": 3,
                },
            ],
        },
        {
            "name": "FitBite Maxi planas",
            "description": "Didelio kaloringumo planas orientuotas į raumenų auginimą ir energiją intensyvioms treniruotėms.",
            "goal_type": "muscle_gain",
            "daily_price": 23.9,
            "calories": 2850,
            "protein_grams": 200,
            "carbs_grams": 280,
            "fats_grams": 95,
            "meals": [
                {
                    "day_of_week": "monday",
                    "meal_type": "breakfast",
                    "title": "Kiaušinių omletas su varške ir avižomis",
                    "description": "3 kiaušiniai, varškė, avižiniai blyneliai ir šilauogės.",
                    "calories": 620,
                    "protein_grams": 48,
                    "carbs_grams": 52,
                    "fats_grams": 22,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "lunch",
                    "title": "Jautienos steikas su bolivine balanda",
                    "description": "Vidutiniškai keptas jautienos kepsnys, bolivinių balandų garnyras ir avokadas.",
                    "calories": 720,
                    "protein_grams": 55,
                    "carbs_grams": 46,
                    "fats_grams": 32,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "dinner",
                    "title": "Lašiša su saldžiąja bulve",
                    "description": "Kepta lašiša su saldžiąja bulve ir šparagais.",
                    "calories": 610,
                    "protein_grams": 44,
                    "carbs_grams": 42,
                    "fats_grams": 28,
                },
                {
                    "day_of_week": "tuesday",
                    "meal_type": "snack",
                    "title": "Kreminis riešutų kokteilis",
                    "description": "Graikiškas jogurtas, riešutų sviestas, bananai ir išrūgų baltymai.",
                    "calories": 420,
                    "protein_grams": 32,
                    "carbs_grams": 38,
                    "fats_grams": 18,
                },
                {
                    "day_of_week": "tuesday",
                    "meal_type": "lunch",
                    "title": "Kalakutiena su pilno grūdo makaronais",
                    "description": "Kalakutienos faršas, pomidorų padažas ir pilno grūdo makaronai.",
                    "calories": 680,
                    "protein_grams": 50,
                    "carbs_grams": 60,
                    "fats_grams": 20,
                },
            ],
        },
        {
            "name": "FitBite Smart planas",
            "description": "Subalansuotas kasdienės mitybos planas su lengvu kalorijų deficitu – idealus norintiems palaikyti sveiką mitybą.",
            "goal_type": "balanced",
            "daily_price": 20.5,
            "calories": 2000,
            "protein_grams": 150,
            "carbs_grams": 200,
            "fats_grams": 70,
            "meals": [
                {
                    "day_of_week": "monday",
                    "meal_type": "breakfast",
                    "title": "Graikiško jogurto dubenėlis",
                    "description": "Graikiškas jogurtas, granola, šilauogės ir linų sėmenys.",
                    "calories": 380,
                    "protein_grams": 28,
                    "carbs_grams": 42,
                    "fats_grams": 12,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "lunch",
                    "title": "Viduržemio jūros bolivinių balandų salotos",
                    "description": "Bolivinės balandos, feta, alyvuogės, pomidorai ir citrininis padažas.",
                    "calories": 520,
                    "protein_grams": 24,
                    "carbs_grams": 58,
                    "fats_grams": 16,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "dinner",
                    "title": "Vištiena su avinžirnių troškiniu",
                    "description": "Vištienos krūtinėlė, avinžirniai, pomidorų ir špinatų troškinys.",
                    "calories": 540,
                    "protein_grams": 46,
                    "carbs_grams": 48,
                    "fats_grams": 18,
                },
                {
                    "day_of_week": "tuesday",
                    "meal_type": "snack",
                    "title": "Varškės kremas su braškėmis",
                    "description": "Lengvas baltyminis užkandis vakare.",
                    "calories": 210,
                    "protein_grams": 24,
                    "carbs_grams": 18,
                    "fats_grams": 6,
                },
            ],
        },
        {
            "name": "FitBite Vegetarų planas",
            "description": "Subalansuotas vegetariškas meniu – optimalus baltymų ir skaidulų balansas be mėsos produktų.",
            "goal_type": "vegetarian",
            "daily_price": 19.2,
            "calories": 1900,
            "protein_grams": 110,
            "carbs_grams": 220,
            "fats_grams": 65,
            "meals": [
                {
                    "day_of_week": "monday",
                    "meal_type": "breakfast",
                    "title": "Tofu kiaušinienė su pilno grūdo skrebučiais",
                    "description": "Šilto tofu kiaušinienė su špinatais ir pomidorais.",
                    "calories": 360,
                    "protein_grams": 24,
                    "carbs_grams": 30,
                    "fats_grams": 14,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "lunch",
                    "title": "Buddha dubenėlis",
                    "description": "Bolivinės balandos, edamame, avokadas, keptos daržovės ir tahini padažas.",
                    "calories": 540,
                    "protein_grams": 28,
                    "carbs_grams": 62,
                    "fats_grams": 18,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "dinner",
                    "title": "Lęšių troškinys su kokosų pienu",
                    "description": "Raudonųjų lęšių, kokosų pieno ir daržovių troškinys su rudaisiais ryžiais.",
                    "calories": 520,
                    "protein_grams": 26,
                    "carbs_grams": 68,
                    "fats_grams": 16,
                },
                {
                    "day_of_week": "tuesday",
                    "meal_type": "snack",
                    "title": "Humusas su daržovių lazdelėmis",
                    "description": "Klasikinis humusas ir traškios daržovės.",
                    "calories": 210,
                    "protein_grams": 10,
                    "carbs_grams": 24,
                    "fats_grams": 9,
                },
            ],
        },
        {
            "name": "FitBite Office planas",
            "description": "Greitai paimami patiekalai biurui – aiškiai pažymėtos porcijos ir sustyguotas grafikas užimtiems profesionalams.",
            "goal_type": "balanced",
            "daily_price": 18.4,
            "calories": 1850,
            "protein_grams": 130,
            "carbs_grams": 210,
            "fats_grams": 60,
            "meals": [
                {
                    "day_of_week": "monday",
                    "meal_type": "breakfast",
                    "title": "Jogurtas su uogomis ir chia",
                    "description": "Paruoštas indelis į biurą – jogurtas, chia ir uogos.",
                    "calories": 320,
                    "protein_grams": 22,
                    "carbs_grams": 34,
                    "fats_grams": 10,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "lunch",
                    "title": "Fit wrap'as su vištiena",
                    "description": "Pilno grūdo lavašas, kepta vištiena, daržovės, jogurtinis padažas.",
                    "calories": 480,
                    "protein_grams": 36,
                    "carbs_grams": 48,
                    "fats_grams": 14,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "snack",
                    "title": "Baltyminis batonėlis",
                    "description": "Paruoštas batonėlis darbui.",
                    "calories": 190,
                    "protein_grams": 18,
                    "carbs_grams": 20,
                    "fats_grams": 6,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "dinner",
                    "title": "Krevetės su azijietiškais ryžiais",
                    "description": "Greitai pašildoma vakarienė po darbo.",
                    "calories": 480,
                    "protein_grams": 36,
                    "carbs_grams": 52,
                    "fats_grams": 12,
                },
            ],
        },
        {
            "name": "FitBite Boost planas",
            "description": "Energingas planas sukurtas didesniam krūviui, HIIT treniruotėms ir ilgoms darbo dienoms – maksimali energija visai dienai.",
            "goal_type": "performance",
            "daily_price": 22.8,
            "calories": 2400,
            "protein_grams": 165,
            "carbs_grams": 250,
            "fats_grams": 80,
            "meals": [
                {
                    "day_of_week": "monday",
                    "meal_type": "breakfast",
                    "title": "Baltyminis glotnutis",
                    "description": "Bananas, mėlynės, avižos ir augalinis baltymų mišinys.",
                    "calories": 420,
                    "protein_grams": 34,
                    "carbs_grams": 48,
                    "fats_grams": 12,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "lunch",
                    "title": "Kario vištiena su rudaisiais ryžiais",
                    "description": "Baltymų ir kompleksinių angliavandenių bomba prieš treniruotę.",
                    "calories": 640,
                    "protein_grams": 46,
                    "carbs_grams": 70,
                    "fats_grams": 18,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "pre-workout",
                    "title": "Datulės ir riešutų sviestas",
                    "description": "Greitai įsisavinami angliavandeniai ir sveikieji riebalai prieš treniruotę.",
                    "calories": 210,
                    "protein_grams": 8,
                    "carbs_grams": 32,
                    "fats_grams": 8,
                },
                {
                    "day_of_week": "monday",
                    "meal_type": "dinner",
                    "title": "Jautienos stir-fry su daržovėmis",
                    "description": "Greitas wok patiekalas su gausiais baltymais atsigavimui.",
                    "calories": 560,
                    "protein_grams": 42,
                    "carbs_grams": 46,
                    "fats_grams": 20,
                },
            ],
        },
    ]

    for plan_data in plans_data:
        if "daily_price" in plan_data:
            plan_data["pricing_options"] = build_pricing_options(plan_data["daily_price"])

    duplicates_removed = False
    for plan_data in plans_data:
        duplicates = (
            db.query(NutritionPlan)
            .filter(
                NutritionPlan.name == plan_data["name"],
                NutritionPlan.owner_id.is_(None),
            )
            .order_by(NutritionPlan.id.asc())
            .all()
        )
        for duplicate in duplicates[1:]:
            db.delete(duplicate)
            duplicates_removed = True
    if duplicates_removed:
        db.commit()
        db.expire_all()

    existing_plans = (
        db.query(NutritionPlan)
        .options(
            selectinload(NutritionPlan.pricing_entries),
            selectinload(NutritionPlan.meals),
        )
        .filter(NutritionPlan.owner_id.is_(None))
        .all()
    )
    plans_by_name = {plan.name: plan for plan in existing_plans}

    created_or_updated = False
    for plan_data in plans_data:
        plan = plans_by_name.get(plan_data["name"])
        if not plan:
            plan = NutritionPlan(
                name=plan_data["name"],
                description=plan_data["description"],
                goal_type=plan_data["goal_type"],
                calories=plan_data.get("calories"),
                protein_grams=plan_data.get("protein_grams"),
                carbs_grams=plan_data.get("carbs_grams"),
                fats_grams=plan_data.get("fats_grams"),
            )
            db.add(plan)
            db.flush()
            plans_by_name[plan.name] = plan
            created_or_updated = True

            for meal in plan_data["meals"]:
                db.add(
                    PlanMeal(
                        plan_id=plan.id,
                        day_of_week=meal["day_of_week"].lower(),
                        meal_type=meal["meal_type"],
                        title=meal["title"],
                        description=meal.get("description"),
                        calories=meal.get("calories"),
                        protein_grams=meal.get("protein_grams"),
                        carbs_grams=meal.get("carbs_grams"),
                        fats_grams=meal.get("fats_grams"),
                    )
                )
        else:
            original_fields = (
                plan.description,
                plan.goal_type,
                plan.calories,
                plan.protein_grams,
                plan.carbs_grams,
                plan.fats_grams,
            )
            updated_fields = (
                plan_data["description"],
                plan_data["goal_type"],
                plan_data.get("calories"),
                plan_data.get("protein_grams"),
                plan_data.get("carbs_grams"),
                plan_data.get("fats_grams"),
            )
            if original_fields != updated_fields:
                (
                    plan.description,
                    plan.goal_type,
                    plan.calories,
                    plan.protein_grams,
                    plan.carbs_grams,
                    plan.fats_grams,
                ) = updated_fields
                created_or_updated = True

            if not plan.meals:
                for meal in plan_data["meals"]:
                    db.add(
                        PlanMeal(
                            plan_id=plan.id,
                            day_of_week=meal["day_of_week"].lower(),
                            meal_type=meal["meal_type"],
                            title=meal["title"],
                            description=meal.get("description"),
                            calories=meal.get("calories"),
                            protein_grams=meal.get("protein_grams"),
                            carbs_grams=meal.get("carbs_grams"),
                            fats_grams=meal.get("fats_grams"),
                        )
                    )
                created_or_updated = True

    if created_or_updated:
        db.commit()
        db.expire_all()
        existing_plans = (
            db.query(NutritionPlan)
            .options(selectinload(NutritionPlan.pricing_entries))
            .filter(NutritionPlan.owner_id.is_(None))
            .all()
        )

    daily_price_by_name = {
        plan_data["name"]: plan_data["daily_price"]
        for plan_data in plans_data
        if plan_data.get("daily_price") is not None
    }

    existing_plans = (
        db.query(NutritionPlan)
        .options(selectinload(NutritionPlan.pricing_entries))
        .all()
    )

    created_pricing = False
    for plan in existing_plans:
        if plan.pricing_entries:
            continue
        daily_price = daily_price_by_name.get(plan.name) or DEFAULT_DAILY_PRICE_BY_GOAL.get(plan.goal_type) or 20.0
        for option in build_pricing_options(daily_price):
            db.add(
                PlanPeriodPricing(
                    plan_id=plan.id,
                    period_days=int(option["period_days"]),
                    price_cents=int(option["price_cents"]),
                    currency=str(option.get("currency", "EUR")),
                )
            )
            created_pricing = True
    if created_pricing:
        db.commit()
