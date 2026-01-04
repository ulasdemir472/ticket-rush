/**
 * Seat Status Enum
 * Represents the possible states of a seat
 */
export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  LOCKED = 'LOCKED',
  SOLD = 'SOLD',
}

/**
 * Seat Entity Properties
 */
export interface SeatProps {
  readonly id: string;
  readonly status: SeatStatus;
  readonly userId: string | null;
  readonly version: number;
  readonly price: number;
  readonly seatNumber: string;
  readonly eventId: string;
}

/**
 * Seat Domain Entity
 * 
 * This is an immutable value object representing a seat in the domain layer.
 * All state changes return a NEW instance rather than mutating the existing one.
 * This ensures thread safety and predictable state management.
 * 
 * @example
 * ```typescript
 * const seat = Seat.create({ id: '123', eventId: 'evt-1', seatNumber: 'A1', price: 100 });
 * const lockedSeat = seat.lock('user-456');
 * const soldSeat = lockedSeat.sell();
 * ```
 */
export class Seat {
  private constructor(private readonly props: SeatProps) {
    Object.freeze(this);
  }

  // ===========================================
  // Factory Methods
  // ===========================================

  /**
   * Creates a new available Seat
   */
  static create(params: {
    id: string;
    eventId: string;
    seatNumber: string;
    price: number;
  }): Seat {
    return new Seat({
      id: params.id,
      eventId: params.eventId,
      seatNumber: params.seatNumber,
      price: params.price,
      status: SeatStatus.AVAILABLE,
      userId: null,
      version: 1,
    });
  }

  /**
   * Reconstitutes a Seat from persistence
   */
  static fromPersistence(props: SeatProps): Seat {
    return new Seat(props);
  }

  // ===========================================
  // Getters (Immutable Access)
  // ===========================================

  get id(): string {
    return this.props.id;
  }

  get status(): SeatStatus {
    return this.props.status;
  }

  get userId(): string | null {
    return this.props.userId;
  }

  get version(): number {
    return this.props.version;
  }

  get price(): number {
    return this.props.price;
  }

  get seatNumber(): string {
    return this.props.seatNumber;
  }

  get eventId(): string {
    return this.props.eventId;
  }

  // ===========================================
  // State Transition Methods (Return New Instance)
  // ===========================================

  /**
   * Locks the seat for a user (e.g., during checkout)
   * @returns A NEW Seat instance with LOCKED status
   * @throws Error if seat is not available
   */
  lock(userId: string): Seat {
    if (this.props.status !== SeatStatus.AVAILABLE) {
      throw new Error(`Cannot lock seat: current status is ${this.props.status}`);
    }

    return new Seat({
      ...this.props,
      status: SeatStatus.LOCKED,
      userId,
      version: this.props.version + 1,
    });
  }

  /**
   * Marks the seat as sold (after successful payment)
   * @returns A NEW Seat instance with SOLD status
   * @throws Error if seat is not locked
   */
  sell(): Seat {
    if (this.props.status !== SeatStatus.LOCKED) {
      throw new Error(`Cannot sell seat: current status is ${this.props.status}`);
    }

    return new Seat({
      ...this.props,
      status: SeatStatus.SOLD,
      version: this.props.version + 1,
    });
  }

  /**
   * Releases a locked seat back to available (e.g., timeout or cancellation)
   * @returns A NEW Seat instance with AVAILABLE status
   * @throws Error if seat is not locked
   */
  release(): Seat {
    if (this.props.status !== SeatStatus.LOCKED) {
      throw new Error(`Cannot release seat: current status is ${this.props.status}`);
    }

    return new Seat({
      ...this.props,
      status: SeatStatus.AVAILABLE,
      userId: null,
      version: this.props.version + 1,
    });
  }

  // ===========================================
  // Query Methods
  // ===========================================

  isAvailable(): boolean {
    return this.props.status === SeatStatus.AVAILABLE;
  }

  isLocked(): boolean {
    return this.props.status === SeatStatus.LOCKED;
  }

  isSold(): boolean {
    return this.props.status === SeatStatus.SOLD;
  }

  isLockedBy(userId: string): boolean {
    return this.props.status === SeatStatus.LOCKED && this.props.userId === userId;
  }

  // ===========================================
  // Serialization
  // ===========================================

  toJSON(): SeatProps {
    return { ...this.props };
  }
}
